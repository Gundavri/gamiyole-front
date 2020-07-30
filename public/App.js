'use strict';

function noop() { }
function is_promise(value) {
    return value && typeof value === 'object' && typeof value.then === 'function';
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

// source: https://html.spec.whatwg.org/multipage/indices.html
const boolean_attributes = new Set([
    'allowfullscreen',
    'allowpaymentrequest',
    'async',
    'autofocus',
    'autoplay',
    'checked',
    'controls',
    'default',
    'defer',
    'disabled',
    'formnovalidate',
    'hidden',
    'ismap',
    'loop',
    'multiple',
    'muted',
    'nomodule',
    'novalidate',
    'open',
    'playsinline',
    'readonly',
    'required',
    'reversed',
    'selected'
]);

const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
// https://infra.spec.whatwg.org/#noncharacter
function spread(args, classes_to_add) {
    const attributes = Object.assign({}, ...args);
    if (classes_to_add) {
        if (attributes.class == null) {
            attributes.class = classes_to_add;
        }
        else {
            attributes.class += ' ' + classes_to_add;
        }
    }
    let str = '';
    Object.keys(attributes).forEach(name => {
        if (invalid_attribute_name_character.test(name))
            return;
        const value = attributes[name];
        if (value === true)
            str += " " + name;
        else if (boolean_attributes.has(name.toLowerCase())) {
            if (value)
                str += " " + name;
        }
        else if (value != null) {
            str += ` ${name}="${String(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;')}"`;
        }
    });
    return str;
}
const escaped = {
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};
function escape(html) {
    return String(html).replace(/["'&<>]/g, match => escaped[match]);
}
function each(items, fn) {
    let str = '';
    for (let i = 0; i < items.length; i += 1) {
        str += fn(items[i], i);
    }
    return str;
}
const missing_component = {
    $$render: () => ''
};
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}
function add_attribute(name, value, boolean) {
    if (value == null || (boolean && !value))
        return '';
    return ` ${name}${value === true ? '' : `=${typeof value === 'string' ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe,
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

const LOCATION = {};
const ROUTER = {};

/**
 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
 *
 * https://github.com/reach/router/blob/master/LICENSE
 * */

function getLocation(source) {
  return {
    ...source.location,
    state: source.history.state,
    key: (source.history.state && source.history.state.key) || "initial"
  };
}

function createHistory(source, options) {
  const listeners = [];
  let location = getLocation(source);

  return {
    get location() {
      return location;
    },

    listen(listener) {
      listeners.push(listener);

      const popstateListener = () => {
        location = getLocation(source);
        listener({ location, action: "POP" });
      };

      source.addEventListener("popstate", popstateListener);

      return () => {
        source.removeEventListener("popstate", popstateListener);

        const index = listeners.indexOf(listener);
        listeners.splice(index, 1);
      };
    },

    navigate(to, { state, replace = false } = {}) {
      state = { ...state, key: Date.now() + "" };
      // try...catch iOS Safari limits to 100 pushState calls
      try {
        if (replace) {
          source.history.replaceState(state, null, to);
        } else {
          source.history.pushState(state, null, to);
        }
      } catch (e) {
        source.location[replace ? "replace" : "assign"](to);
      }

      location = getLocation(source);
      listeners.forEach(listener => listener({ location, action: "PUSH" }));
    }
  };
}

// Stores history entries in memory for testing or other platforms like Native
function createMemorySource(initialPathname = "/") {
  let index = 0;
  const stack = [{ pathname: initialPathname, search: "" }];
  const states = [];

  return {
    get location() {
      return stack[index];
    },
    addEventListener(name, fn) {},
    removeEventListener(name, fn) {},
    history: {
      get entries() {
        return stack;
      },
      get index() {
        return index;
      },
      get state() {
        return states[index];
      },
      pushState(state, _, uri) {
        const [pathname, search = ""] = uri.split("?");
        index++;
        stack.push({ pathname, search });
        states.push(state);
      },
      replaceState(state, _, uri) {
        const [pathname, search = ""] = uri.split("?");
        stack[index] = { pathname, search };
        states[index] = state;
      }
    }
  };
}

// Global history uses window.history as the source if available,
// otherwise a memory history
const canUseDOM = Boolean(
  typeof window !== "undefined" &&
    window.document &&
    window.document.createElement
);
const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
const { navigate } = globalHistory;

/**
 * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
 *
 * https://github.com/reach/router/blob/master/LICENSE
 * */

const paramRe = /^:(.+)/;

const SEGMENT_POINTS = 4;
const STATIC_POINTS = 3;
const DYNAMIC_POINTS = 2;
const SPLAT_PENALTY = 1;
const ROOT_POINTS = 1;

/**
 * Check if `string` starts with `search`
 * @param {string} string
 * @param {string} search
 * @return {boolean}
 */
function startsWith(string, search) {
  return string.substr(0, search.length) === search;
}

/**
 * Check if `segment` is a root segment
 * @param {string} segment
 * @return {boolean}
 */
function isRootSegment(segment) {
  return segment === "";
}

/**
 * Check if `segment` is a dynamic segment
 * @param {string} segment
 * @return {boolean}
 */
function isDynamic(segment) {
  return paramRe.test(segment);
}

/**
 * Check if `segment` is a splat
 * @param {string} segment
 * @return {boolean}
 */
function isSplat(segment) {
  return segment[0] === "*";
}

/**
 * Split up the URI into segments delimited by `/`
 * @param {string} uri
 * @return {string[]}
 */
function segmentize(uri) {
  return (
    uri
      // Strip starting/ending `/`
      .replace(/(^\/+|\/+$)/g, "")
      .split("/")
  );
}

/**
 * Strip `str` of potential start and end `/`
 * @param {string} str
 * @return {string}
 */
function stripSlashes(str) {
  return str.replace(/(^\/+|\/+$)/g, "");
}

/**
 * Score a route depending on how its individual segments look
 * @param {object} route
 * @param {number} index
 * @return {object}
 */
function rankRoute(route, index) {
  const score = route.default
    ? 0
    : segmentize(route.path).reduce((score, segment) => {
        score += SEGMENT_POINTS;

        if (isRootSegment(segment)) {
          score += ROOT_POINTS;
        } else if (isDynamic(segment)) {
          score += DYNAMIC_POINTS;
        } else if (isSplat(segment)) {
          score -= SEGMENT_POINTS + SPLAT_PENALTY;
        } else {
          score += STATIC_POINTS;
        }

        return score;
      }, 0);

  return { route, score, index };
}

/**
 * Give a score to all routes and sort them on that
 * @param {object[]} routes
 * @return {object[]}
 */
function rankRoutes(routes) {
  return (
    routes
      .map(rankRoute)
      // If two routes have the exact same score, we go by index instead
      .sort((a, b) =>
        a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
      )
  );
}

/**
 * Ranks and picks the best route to match. Each segment gets the highest
 * amount of points, then the type of segment gets an additional amount of
 * points where
 *
 *  static > dynamic > splat > root
 *
 * This way we don't have to worry about the order of our routes, let the
 * computers do it.
 *
 * A route looks like this
 *
 *  { path, default, value }
 *
 * And a returned match looks like:
 *
 *  { route, params, uri }
 *
 * @param {object[]} routes
 * @param {string} uri
 * @return {?object}
 */
function pick(routes, uri) {
  let match;
  let default_;

  const [uriPathname] = uri.split("?");
  const uriSegments = segmentize(uriPathname);
  const isRootUri = uriSegments[0] === "";
  const ranked = rankRoutes(routes);

  for (let i = 0, l = ranked.length; i < l; i++) {
    const route = ranked[i].route;
    let missed = false;

    if (route.default) {
      default_ = {
        route,
        params: {},
        uri
      };
      continue;
    }

    const routeSegments = segmentize(route.path);
    const params = {};
    const max = Math.max(uriSegments.length, routeSegments.length);
    let index = 0;

    for (; index < max; index++) {
      const routeSegment = routeSegments[index];
      const uriSegment = uriSegments[index];

      if (routeSegment !== undefined && isSplat(routeSegment)) {
        // Hit a splat, just grab the rest, and return a match
        // uri:   /files/documents/work
        // route: /files/* or /files/*splatname
        const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

        params[splatName] = uriSegments
          .slice(index)
          .map(decodeURIComponent)
          .join("/");
        break;
      }

      if (uriSegment === undefined) {
        // URI is shorter than the route, no match
        // uri:   /users
        // route: /users/:userId
        missed = true;
        break;
      }

      let dynamicMatch = paramRe.exec(routeSegment);

      if (dynamicMatch && !isRootUri) {
        const value = decodeURIComponent(uriSegment);
        params[dynamicMatch[1]] = value;
      } else if (routeSegment !== uriSegment) {
        // Current segments don't match, not dynamic, not splat, so no match
        // uri:   /users/123/settings
        // route: /users/:id/profile
        missed = true;
        break;
      }
    }

    if (!missed) {
      match = {
        route,
        params,
        uri: "/" + uriSegments.slice(0, index).join("/")
      };
      break;
    }
  }

  return match || default_ || null;
}

/**
 * Check if the `path` matches the `uri`.
 * @param {string} path
 * @param {string} uri
 * @return {?object}
 */
function match(route, uri) {
  return pick([route], uri);
}

/**
 * Add the query to the pathname if a query is given
 * @param {string} pathname
 * @param {string} [query]
 * @return {string}
 */
function addQuery(pathname, query) {
  return pathname + (query ? `?${query}` : "");
}

/**
 * Resolve URIs as though every path is a directory, no files. Relative URIs
 * in the browser can feel awkward because not only can you be "in a directory",
 * you can be "at a file", too. For example:
 *
 *  browserSpecResolve('foo', '/bar/') => /bar/foo
 *  browserSpecResolve('foo', '/bar') => /foo
 *
 * But on the command line of a file system, it's not as complicated. You can't
 * `cd` from a file, only directories. This way, links have to know less about
 * their current path. To go deeper you can do this:
 *
 *  <Link to="deeper"/>
 *  // instead of
 *  <Link to=`{${props.uri}/deeper}`/>
 *
 * Just like `cd`, if you want to go deeper from the command line, you do this:
 *
 *  cd deeper
 *  # not
 *  cd $(pwd)/deeper
 *
 * By treating every path as a directory, linking to relative paths should
 * require less contextual information and (fingers crossed) be more intuitive.
 * @param {string} to
 * @param {string} base
 * @return {string}
 */
function resolve(to, base) {
  // /foo/bar, /baz/qux => /foo/bar
  if (startsWith(to, "/")) {
    return to;
  }

  const [toPathname, toQuery] = to.split("?");
  const [basePathname] = base.split("?");
  const toSegments = segmentize(toPathname);
  const baseSegments = segmentize(basePathname);

  // ?a=b, /users?b=c => /users?a=b
  if (toSegments[0] === "") {
    return addQuery(basePathname, toQuery);
  }

  // profile, /users/789 => /users/789/profile
  if (!startsWith(toSegments[0], ".")) {
    const pathname = baseSegments.concat(toSegments).join("/");

    return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
  }

  // ./       , /users/123 => /users/123
  // ../      , /users/123 => /users
  // ../..    , /users/123 => /
  // ../../one, /a/b/c/d   => /a/b/one
  // .././one , /a/b/c/d   => /a/b/c/one
  const allSegments = baseSegments.concat(toSegments);
  const segments = [];

  allSegments.forEach(segment => {
    if (segment === "..") {
      segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });

  return addQuery("/" + segments.join("/"), toQuery);
}

/**
 * Combines the `basepath` and the `path` into one path.
 * @param {string} basepath
 * @param {string} path
 */
function combinePaths(basepath, path) {
  return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
}

/* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.24.0 */

const Router = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $base;
	let $location;
	let $routes;
	let { basepath = "/" } = $$props;
	let { url = null } = $$props;
	const locationContext = getContext(LOCATION);
	const routerContext = getContext(ROUTER);
	const routes = writable([]);
	$routes = get_store_value(routes);
	const activeRoute = writable(null);
	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

	// If locationContext is not set, this is the topmost Router in the tree.
	// If the `url` prop is given we force the location to it.
	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

	$location = get_store_value(location);

	// If routerContext is set, the routerBase of the parent Router
	// will be the base for this Router's descendants.
	// If routerContext is not set, the path and resolved uri will both
	// have the value of the basepath prop.
	const base = routerContext
	? routerContext.routerBase
	: writable({ path: basepath, uri: basepath });

	$base = get_store_value(base);

	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
		// If there is no activeRoute, the routerBase will be identical to the base.
		if (activeRoute === null) {
			return base;
		}

		const { path: basepath } = base;
		const { route, uri } = activeRoute;

		// Remove the potential /* or /*splatname from
		// the end of the child Routes relative paths.
		const path = route.default
		? basepath
		: route.path.replace(/\*.*$/, "");

		return { path, uri };
	});

	function registerRoute(route) {
		const { path: basepath } = $base;
		let { path } = route;

		// We store the original path in the _path property so we can reuse
		// it when the basepath changes. The only thing that matters is that
		// the route reference is intact, so mutation is fine.
		route._path = path;

		route.path = combinePaths(basepath, path);

		if (typeof window === "undefined") {
			// In SSR we should set the activeRoute immediately if it is a match.
			// If there are more Routes being registered after a match is found,
			// we just skip them.
			if (hasActiveRoute) {
				return;
			}

			const matchingRoute = match(route, $location.pathname);

			if (matchingRoute) {
				activeRoute.set(matchingRoute);
				hasActiveRoute = true;
			}
		} else {
			routes.update(rs => {
				rs.push(route);
				return rs;
			});
		}
	}

	function unregisterRoute(route) {
		routes.update(rs => {
			const index = rs.indexOf(route);
			rs.splice(index, 1);
			return rs;
		});
	}

	if (!locationContext) {
		// The topmost Router in the tree is responsible for updating
		// the location store and supplying it through context.
		onMount(() => {
			const unlisten = globalHistory.listen(history => {
				location.set(history.location);
			});

			return unlisten;
		});

		setContext(LOCATION, location);
	}

	setContext(ROUTER, {
		activeRoute,
		base,
		routerBase,
		registerRoute,
		unregisterRoute
	});

	if ($$props.basepath === void 0 && $$bindings.basepath && basepath !== void 0) $$bindings.basepath(basepath);
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);
	$base = get_store_value(base);
	$location = get_store_value(location);
	$routes = get_store_value(routes);

	 {
		{
			const { path: basepath } = $base;

			routes.update(rs => {
				rs.forEach(r => r.path = combinePaths(basepath, r._path));
				return rs;
			});
		}
	}

	 {
		{
			const bestMatch = pick($routes, $location.pathname);
			activeRoute.set(bestMatch);
		}
	}

	return `${$$slots.default ? $$slots.default({}) : ``}`;
});

/* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.24.0 */

const Route = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $activeRoute;
	let $location;
	let { path = "" } = $$props;
	let { component = null } = $$props;
	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
	$activeRoute = get_store_value(activeRoute);
	const location = getContext(LOCATION);
	$location = get_store_value(location);

	const route = {
		path,
		// If no path prop is given, this Route will act as the default Route
		// that is rendered if no other Route in the Router is a match.
		default: path === ""
	};

	let routeParams = {};
	let routeProps = {};
	registerRoute(route);

	// There is no need to unregister Routes in SSR since it will all be
	// thrown away anyway.
	if (typeof window !== "undefined") {
		onDestroy(() => {
			unregisterRoute(route);
		});
	}

	if ($$props.path === void 0 && $$bindings.path && path !== void 0) $$bindings.path(path);
	if ($$props.component === void 0 && $$bindings.component && component !== void 0) $$bindings.component(component);
	$activeRoute = get_store_value(activeRoute);
	$location = get_store_value(location);

	 {
		if ($activeRoute && $activeRoute.route === route) {
			routeParams = $activeRoute.params;
		}
	}

	 {
		{
			const { path, component, ...rest } = $$props;
			routeProps = rest;
		}
	}

	return `${$activeRoute !== null && $activeRoute.route === route
	? `${component !== null
		? `${validate_component(component || missing_component, "svelte:component").$$render($$result, Object.assign({ location: $location }, routeParams, routeProps), {}, {})}`
		: `${$$slots.default
			? $$slots.default({ params: routeParams, location: $location })
			: ``}`}`
	: ``}`;
});

/* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.24.0 */

const Link = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let $base;
	let $location;
	let { to = "#" } = $$props;
	let { replace = false } = $$props;
	let { state = {} } = $$props;
	let { getProps = () => ({}) } = $$props;
	const { base } = getContext(ROUTER);
	$base = get_store_value(base);
	const location = getContext(LOCATION);
	$location = get_store_value(location);
	const dispatch = createEventDispatcher();
	let href, isPartiallyCurrent, isCurrent, props;

	if ($$props.to === void 0 && $$bindings.to && to !== void 0) $$bindings.to(to);
	if ($$props.replace === void 0 && $$bindings.replace && replace !== void 0) $$bindings.replace(replace);
	if ($$props.state === void 0 && $$bindings.state && state !== void 0) $$bindings.state(state);
	if ($$props.getProps === void 0 && $$bindings.getProps && getProps !== void 0) $$bindings.getProps(getProps);
	$base = get_store_value(base);
	$location = get_store_value(location);
	href = to === "/" ? $base.uri : resolve(to, $base.uri);
	isPartiallyCurrent = startsWith($location.pathname, href);
	isCurrent = href === $location.pathname;
	let ariaCurrent = isCurrent ? "page" : undefined;

	props = getProps({
		location: $location,
		href,
		isPartiallyCurrent,
		isCurrent
	});

	return `<a${spread([{ href: escape(href) }, { "aria-current": escape(ariaCurrent) }, props])}>${$$slots.default ? $$slots.default({}) : ``}</a>`;
});

class DeviceDetectorService {
    constructor() {
    }

    static get isBrowser() {
        return typeof window !== 'undefined';
    }

    static get latUni() {
        return 41.805531179838034;
    }

    static get lngUni() {
        return 44.76849954114065;
    }

    static get maxAllowedDist() {
        return 0.0025;
    }
}

var baseAPIUrl="http://localhost:8082";

class AuthService {
    constructor() {
    }

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    async validateTokenAndNavigate() {
        if(!this.getToken()) {
            navigate('/login');
            console.log('araDzmao');
            return false;
        } else {
            const res = await this.validateToken();
            if(res.error) {
                navigate('/login');
            }
            return !res.error;
        }
    }

    async login(email, password) {
        const res = await (await fetch(baseAPIUrl + '/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
            })
        })).json();
        return res;
    }

    async register(name, surname, email, password) {
        const res = await (await fetch(baseAPIUrl + '/register', {
            method: 'POST',
            body: JSON.stringify({
                name,
                surname,
                email,
                password
            })
        })).json();
        return res;
    }

    async validateToken() {
        const res = await (await fetch(baseAPIUrl + '/validate-token?token=' + this.getToken())).json();
        return res;
    }

    setToken(token) {
        if(DeviceDetectorService.isBrowser) {
            localStorage.setItem(this.TOKEN_KEY, token);
        }
    }

    getToken() {
        if(DeviceDetectorService.isBrowser) {
            return localStorage.getItem(this.TOKEN_KEY);
        }
    }

    deleteToken() {
        if(DeviceDetectorService.isBrowser) {
            localStorage.removeItem(this.TOKEN_KEY);
            this.validateTokenAndNavigate().then(r => {});
        }
    }

    get emailRegex() {
        return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    }

    get TOKEN_KEY() {
        return 'authTokenKey';
    }
}

const authService = AuthService.getInstance();

class GoogleService {
    constructor() {

    }

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    async getSuggestedPlaces(place) {
        const res = await (await fetch(`${baseAPIUrl}/destination-autocomplete?place=${place}&token=${authService.getToken()}`)).json();
        let toRet = [];
        if (res.predictions) {
            for (let i = 0; i < res.predictions.length; i++) {
                let toConvert = res.predictions[i].description;
                toRet.push(toConvert);
            }
        }
        return toRet;
    }

    async getGeometryForPlace(place) {
        const res = await (await fetch(`${baseAPIUrl}/find-place-from-text?place=${place}&token=${authService.getToken()}`)).json();
        return res;
    }
}

/* src/routes/Login.svelte generated by Svelte v3.24.0 */

const css = {
	code: ".wrapper.svelte-rnsfl4.svelte-rnsfl4{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-rnsfl4.svelte-rnsfl4{width:350px}form.svelte-rnsfl4 .action.svelte-rnsfl4{display:flex;justify-content:space-between;align-items:center}",
	map: "{\"version\":3,\"file\":\"Login.svelte\",\"sources\":[\"Login.svelte\"],\"sourcesContent\":[\"<script lang=\\\"typescript\\\">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\\n    return new (P || (P = Promise))(function (resolve, reject) {\\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\\n        function rejected(value) { try { step(generator[\\\"throw\\\"](value)); } catch (e) { reject(e); } }\\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\\n    });\\n};\\nimport { onMount } from 'svelte';\\nimport { Link, navigate } from \\\"svelte-routing\\\";\\nimport { AuthService } from '../services/auth.service';\\nlet submitClicked = false;\\nlet loginError = false;\\nlet email = '', password = '';\\nconst authService = AuthService.getInstance();\\nonMount(() => {\\n    authService.deleteToken();\\n});\\nfunction isValidInputs() {\\n    return (email.length >= 6 && email.length <= 64) &&\\n        (password.length >= 6 && password.length <= 64) &&\\n        authService.emailRegex.test(email);\\n}\\nfunction onKeyup(event) {\\n    if (event.keyCode === 13) {\\n        onSubmit();\\n    }\\n}\\nfunction onSubmit() {\\n    return __awaiter(this, void 0, void 0, function* () {\\n        submitClicked = true;\\n        if (isValidInputs) {\\n            let res = yield authService.login(email, password);\\n            if (!res.error) {\\n                authService.setToken(res.token);\\n                navigate('/');\\n            }\\n            else {\\n                loginError = true;\\n            }\\n        }\\n    });\\n}\\n</script>\\n\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}</style>\\n\\n<div class=\\\"wrapper\\\">\\n    <form>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputEmail1\\\">Email address</label>\\n            <input bind:value={email} type=\\\"email\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputEmail1\\\" aria-describedby=\\\"emailHelp\\\" placeholder=\\\"Enter email\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if email.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is required*</span> \\n            {/if}\\n            {#if email.length !== 0 && email.length < 6 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is too short*</span> \\n            {/if}\\n            {#if email.length > 64 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is too long*</span> \\n            {/if}\\n            {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is not valid*</span> \\n            {/if}\\n        </div>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputPassword1\\\">Password</label>\\n            <input bind:value={password} type=\\\"password\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputPassword1\\\" placeholder=\\\"Password\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if password.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Password is required*</span> \\n            {/if}\\n            {#if password.length !== 0 && password.length < 6 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Password is too short*</span> \\n            {/if}\\n            {#if password.length > 64 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Password is too long*</span> \\n            {/if}\\n        </div>\\n        {#if loginError && isValidInputs()}\\n                <span class=\\\"error text-danger\\\">Email or Password is wrong*</span> \\n        {/if}\\n        <div class=\\\"action\\\">\\n            <Link class=\\\"already\\\" to=\\\"/register\\\">\\n                Not Registered Yet?\\n            </Link>\\n            <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click=\\\"{onSubmit}\\\">Login</button>\\n        </div>\\n    </form>\\n</div>\"],\"names\":[],\"mappings\":\"AA8CmB,QAAQ,4BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,kBAAI,CAAC,OAAO,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC\"}"
};

const Login = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
			? value
			: new P(function (resolve) {
						resolve(value);
					});
		}

		return new (P || (P = Promise))(function (resolve, reject) {
				function fulfilled(value) {
					try {
						step(generator.next(value));
					} catch(e) {
						reject(e);
					}
				}

				function rejected(value) {
					try {
						step(generator["throw"](value));
					} catch(e) {
						reject(e);
					}
				}

				function step(result) {
					result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
				}

				step((generator = generator.apply(thisArg, _arguments || [])).next());
			});
	};

	let submitClicked = false;
	let email = "", password = "";
	const authService = AuthService.getInstance();

	onMount(() => {
		authService.deleteToken();
	});

	$$result.css.add(css);

	return `<div class="${"wrapper svelte-rnsfl4"}"><form class="${"svelte-rnsfl4"}"><div class="${"form-group"}"><label for="${"exampleInputEmail1"}">Email address</label>
            <input type="${"email"}" class="${"form-control"}" id="${"exampleInputEmail1"}" aria-describedby="${"emailHelp"}" placeholder="${"Enter email"}"${add_attribute("value", email, 1)}>
            ${email.length === 0 && submitClicked
	? `<span class="${"error text-danger"}">Email is required*</span>`
	: ``}
            ${email.length !== 0 && email.length < 6 && submitClicked
	? `<span class="${"error text-danger"}">Email is too short*</span>`
	: ``}
            ${email.length > 64 && submitClicked
	? `<span class="${"error text-danger"}">Email is too long*</span>`
	: ``}
            ${email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked
	? `<span class="${"error text-danger"}">Email is not valid*</span>`
	: ``}</div>
        <div class="${"form-group"}"><label for="${"exampleInputPassword1"}">Password</label>
            <input type="${"password"}" class="${"form-control"}" id="${"exampleInputPassword1"}" placeholder="${"Password"}"${add_attribute("value", password, 1)}>
            ${password.length === 0 && submitClicked
	? `<span class="${"error text-danger"}">Password is required*</span>`
	: ``}
            ${password.length !== 0 && password.length < 6 && submitClicked
	? `<span class="${"error text-danger"}">Password is too short*</span>`
	: ``}
            ${password.length > 64 && submitClicked
	? `<span class="${"error text-danger"}">Password is too long*</span>`
	: ``}</div>
        ${ ``}
        <div class="${"action svelte-rnsfl4"}">${validate_component(Link, "Link").$$render($$result, { class: "already", to: "/register" }, {}, {
		default: () => `Not Registered Yet?
            `
	})}
            <button type="${"button"}" class="${"btn btn-primary"}">Login</button></div></form></div>`;
});

/* src/routes/Register.svelte generated by Svelte v3.24.0 */

const css$1 = {
	code: ".wrapper.svelte-1cmpm85.svelte-1cmpm85{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-1cmpm85.svelte-1cmpm85{width:350px}form.svelte-1cmpm85 .action.svelte-1cmpm85{display:flex;justify-content:space-between;align-items:center}form.svelte-1cmpm85 .text-danger.svelte-1cmpm85{font-size:13px;font-style:italic}",
	map: "{\"version\":3,\"file\":\"Register.svelte\",\"sources\":[\"Register.svelte\"],\"sourcesContent\":[\"<script>\\nimport { onMount } from 'svelte';\\nimport { Link, navigate } from \\\"svelte-routing\\\";\\nimport { AuthService } from '../services/auth.service';\\n\\nlet submitClicked = false;\\nlet registerError = false;\\nlet name = '', surname = '', email = '', password1 = '', password2 = '';\\n\\nconst authService = AuthService.getInstance();\\n\\nonMount(() => {\\n    authService.deleteToken();\\n});\\n\\n\\nfunction isValidInputs() {\\n    return (name.length >= 2 && name.length <= 32) &&\\n        (surname.length >= 2 && surname.length <= 32) &&\\n        (email.length >= 6 && email.length <= 64) &&\\n        authService.emailRegex.test(email) &&\\n        (password1.length >= 6 && password1.length <= 64) &&\\n        password1 === password2;\\n}\\n\\nfunction onKeyup(event) {\\n    if(event.keyCode === 13){\\n        onSubmit();\\n    }\\n}\\n\\nasync function onSubmit() {\\n    submitClicked = true;\\n    if(isValidInputs()) {\\n        let res = await authService.register(name, surname, email, password1);\\n        if(!res.error) {\\n            authService.setToken(res.token);\\n            navigate('/');\\n        } else {\\n            registerError = true;\\n        }\\n    }\\n}\\n</script>\\n\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}\\nform .text-danger {\\n  font-size: 13px;\\n  font-style: italic;\\n}</style>\\n\\n<div class=\\\"wrapper\\\">\\n    <form>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputEmail1\\\">Name</label>\\n            <input bind:value={name} type=\\\"text\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputName\\\" placeholder=\\\"Enter name\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if name.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Name is required*</span> \\n            {/if}\\n            {#if name.length !== 0 && name.length < 2 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Name is too short*</span> \\n            {/if}\\n            {#if name.length > 32 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Name is too long*</span> \\n            {/if}\\n        </div>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputEmail1\\\">Surname</label>\\n            <input bind:value={surname} type=\\\"text\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputSurname\\\" placeholder=\\\"Enter surname\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if surname.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Surname is required*</span> \\n            {/if}\\n            {#if surname.length !== 0 && surname.length < 2 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Surname is too short*</span> \\n            {/if}\\n            {#if surname.length > 32 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Surname is too long*</span> \\n            {/if}\\n        </div>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputEmail1\\\">Email address</label>\\n            <input bind:value={email} type=\\\"email\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputEmail1\\\" aria-describedby=\\\"emailHelp\\\" placeholder=\\\"Enter email\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if email.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is required*</span> \\n            {/if}\\n            {#if email.length !== 0 && email.length < 6 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is too short*</span> \\n            {/if}\\n            {#if email.length > 64 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is too long*</span> \\n            {/if}\\n            {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}\\n                <span class=\\\"error text-danger\\\">Email is not valid*</span> \\n            {/if}\\n        </div>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputPassword1\\\">Password</label>\\n            <input bind:value={password1} type=\\\"password\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputPassword1\\\" placeholder=\\\"Password\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if password1.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Password is required*</span> \\n            {/if}\\n            {#if password1.length !== 0 && password1.length < 6 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Password is too short*</span> \\n            {/if}\\n            {#if password1.length > 64 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Password is too long*</span> \\n            {/if}\\n        </div>\\n        <div class=\\\"form-group\\\">\\n            <label for=\\\"exampleInputPassword1\\\">Confirm Password</label>\\n            <input bind:value={password2} type=\\\"password\\\" class=\\\"form-control\\\" \\n                id=\\\"exampleInputPassword2\\\" placeholder=\\\"Password\\\" on:keyup=\\\"{onKeyup}\\\">\\n            {#if password2.length === 0 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Please confirm password*</span> \\n            {/if}\\n            {#if password2.length !== 0 && password1 !== password2 && submitClicked}\\n                <span class=\\\"error text-danger\\\">Passwords do not match*</span> \\n            {/if}\\n        </div>\\n        {#if registerError && isValidInputs()}\\n                <span class=\\\"error text-danger\\\">Email already exists*</span> \\n        {/if}\\n        <div class=\\\"action\\\">\\n            <Link class=\\\"already\\\" to=\\\"/login\\\">\\n                Already Registered?\\n            </Link>\\n            <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click=\\\"{onSubmit}\\\">Register</button>\\n        </div>\\n    </form>\\n</div>\"],\"names\":[],\"mappings\":\"AA6CmB,QAAQ,8BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,8BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,mBAAI,CAAC,OAAO,eAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC,AACD,mBAAI,CAAC,YAAY,eAAC,CAAC,AACjB,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,MAAM,AACpB,CAAC\"}"
};

const Register = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let submitClicked = false;
	let name = "", surname = "", email = "", password1 = "", password2 = "";
	const authService = AuthService.getInstance();

	onMount(() => {
		authService.deleteToken();
	});

	$$result.css.add(css$1);

	return `<div class="${"wrapper svelte-1cmpm85"}"><form class="${"svelte-1cmpm85"}"><div class="${"form-group"}"><label for="${"exampleInputEmail1"}">Name</label>
            <input type="${"text"}" class="${"form-control"}" id="${"exampleInputName"}" placeholder="${"Enter name"}"${add_attribute("value", name, 1)}>
            ${name.length === 0 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Name is required*</span>`
	: ``}
            ${name.length !== 0 && name.length < 2 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Name is too short*</span>`
	: ``}
            ${name.length > 32 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Name is too long*</span>`
	: ``}</div>
        <div class="${"form-group"}"><label for="${"exampleInputEmail1"}">Surname</label>
            <input type="${"text"}" class="${"form-control"}" id="${"exampleInputSurname"}" placeholder="${"Enter surname"}"${add_attribute("value", surname, 1)}>
            ${surname.length === 0 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Surname is required*</span>`
	: ``}
            ${surname.length !== 0 && surname.length < 2 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Surname is too short*</span>`
	: ``}
            ${surname.length > 32 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Surname is too long*</span>`
	: ``}</div>
        <div class="${"form-group"}"><label for="${"exampleInputEmail1"}">Email address</label>
            <input type="${"email"}" class="${"form-control"}" id="${"exampleInputEmail1"}" aria-describedby="${"emailHelp"}" placeholder="${"Enter email"}"${add_attribute("value", email, 1)}>
            ${email.length === 0 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Email is required*</span>`
	: ``}
            ${email.length !== 0 && email.length < 6 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Email is too short*</span>`
	: ``}
            ${email.length > 64 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Email is too long*</span>`
	: ``}
            ${email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Email is not valid*</span>`
	: ``}</div>
        <div class="${"form-group"}"><label for="${"exampleInputPassword1"}">Password</label>
            <input type="${"password"}" class="${"form-control"}" id="${"exampleInputPassword1"}" placeholder="${"Password"}"${add_attribute("value", password1, 1)}>
            ${password1.length === 0 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Password is required*</span>`
	: ``}
            ${password1.length !== 0 && password1.length < 6 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Password is too short*</span>`
	: ``}
            ${password1.length > 64 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Password is too long*</span>`
	: ``}</div>
        <div class="${"form-group"}"><label for="${"exampleInputPassword1"}">Confirm Password</label>
            <input type="${"password"}" class="${"form-control"}" id="${"exampleInputPassword2"}" placeholder="${"Password"}"${add_attribute("value", password2, 1)}>
            ${password2.length === 0 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Please confirm password*</span>`
	: ``}
            ${password2.length !== 0 && password1 !== password2 && submitClicked
	? `<span class="${"error text-danger svelte-1cmpm85"}">Passwords do not match*</span>`
	: ``}</div>
        ${ ``}
        <div class="${"action svelte-1cmpm85"}">${validate_component(Link, "Link").$$render($$result, { class: "already", to: "/login" }, {}, {
		default: () => `Already Registered?
            `
	})}
            <button type="${"button"}" class="${"btn btn-primary"}">Register</button></div></form></div>`;
});

class ProfileService {
    constructor(){}

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    async getUserProfile(authService) {
        if(DeviceDetectorService.isBrowser){
            const email = new URLSearchParams(window.location.search).get("email");
            let result;
            if(email !== null){
                const response = await fetch(`${baseAPIUrl}/profile?email=${email}`);
                result = await response.json();
                if (result.error !== undefined) {
                    navigate("/profile");
                    return;
                }
            } else {
                const response = await fetch(`${baseAPIUrl}/profile`, {
                    method: "POST",
                    body: JSON.stringify({
                        token: authService.getToken()
                    })
                });
                result = await response.json();
                result.isOwn = true;
            }
            return result.user;
        } else return; 
    }

    async updateUserProfile(user, authService) {
        if(DeviceDetectorService.isBrowser){
            let tmpUser = Object.assign({}, user);
            tmpUser.token = authService.getToken();
            const response = await fetch(`${baseAPIUrl}/profile-edit`, {
                method: "POST",
                body: JSON.stringify({
                    token: tmpUser.token,
                    name: tmpUser.name,
                    phone: tmpUser.phone,
                    surname: tmpUser.surname
                })
            });
            return;
        }
    }
}

/* src/routes/Profile.svelte generated by Svelte v3.24.0 */

const css$2 = {
	code: ".btn.svelte-ej0sbd{margin-top:50px}",
	map: "{\"version\":3,\"file\":\"Profile.svelte\",\"sources\":[\"Profile.svelte\"],\"sourcesContent\":[\"<script lang=\\\"typescript\\\">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\\n    return new (P || (P = Promise))(function (resolve, reject) {\\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\\n        function rejected(value) { try { step(generator[\\\"throw\\\"](value)); } catch (e) { reject(e); } }\\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\\n    });\\n};\\nimport { onMount } from \\\"svelte\\\";\\nimport { AuthService } from \\\"../services/auth.service\\\";\\nimport { ProfileService } from \\\"../services/profile.service\\\";\\nimport { navigate } from \\\"svelte-routing\\\";\\nimport { DeviceDetectorService } from '../services/deviceDetectorService.service';\\nconst authService = AuthService.getInstance();\\nlet isOwn;\\nonMount(() => __awaiter(void 0, void 0, void 0, function* () {\\n    authService.validateTokenAndNavigate().then(res => {\\n    });\\n}));\\nif (DeviceDetectorService.isBrowser) {\\n    const qEmail = new URLSearchParams(window.location.search).get(\\\"email\\\");\\n    isOwn = qEmail === null ? true : false;\\n}\\nconst profileService = ProfileService.getInstance();\\n</script>\\n\\n<style type=\\\"text/scss\\\">.btn {\\n  margin-top: 50px;\\n}</style>\\n\\n<div class=\\\"container\\\">\\n    <h1>Profile</h1>\\n    <hr>\\n    <div class=\\\"row\\\">\\n        {#await profileService.getUserProfile(authService)}\\n            <img src=\\\"/gifs/spinner.gif\\\" alt=\\\"\\\" style=\\\"margin: auto\\\">\\n        {:then profile}\\n            <!-- left column -->\\n            <div class=\\\"col-md-3\\\">\\n            <div >\\n                <img src=\\\"//placehold.it/100\\\" class=\\\"avatar img-circle\\\" alt=\\\"avatar\\\">\\n            </div>\\n                {#if isOwn}\\n                    <input type=\\\"submit\\\" class=\\\"btn btn-primary\\\" on:click=\\\"\\\" value=\\\"Edit brofile\\\">\\n                {/if}\\n            </div>\\n            \\n            <!-- edit form column -->\\n            <div class=\\\"col-md-9 personal-info\\\">\\n                <h3>Personal info</h3>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">First name:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.name}</div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Last name:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.surname}</div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Email:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.email}</div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Age:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.age}</div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Phone:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.phone}</div>\\n                </div>\\n            </div>\\n        \\n        {:catch error}\\n            <p>An error occurred!</p>\\n        {/await}\\n    </div>\\n</div>\\n\\n\"],\"names\":[],\"mappings\":\"AA2BwB,IAAI,cAAC,CAAC,AAC5B,UAAU,CAAE,IAAI,AAClB,CAAC\"}"
};

const Profile = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
			? value
			: new P(function (resolve) {
						resolve(value);
					});
		}

		return new (P || (P = Promise))(function (resolve, reject) {
				function fulfilled(value) {
					try {
						step(generator.next(value));
					} catch(e) {
						reject(e);
					}
				}

				function rejected(value) {
					try {
						step(generator["throw"](value));
					} catch(e) {
						reject(e);
					}
				}

				function step(result) {
					result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
				}

				step((generator = generator.apply(thisArg, _arguments || [])).next());
			});
	};

	const authService = AuthService.getInstance();
	let isOwn;

	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
		authService.validateTokenAndNavigate().then(res => {
			
		});
	}));

	if (DeviceDetectorService.isBrowser) {
		const qEmail = new URLSearchParams(window.location.search).get("email");
		isOwn = qEmail === null ? true : false;
	}

	const profileService = ProfileService.getInstance();
	$$result.css.add(css$2);

	return `<div class="${"container"}"><h1>Profile</h1>
    <hr>
    <div class="${"row"}">${(function (__value) {
		if (is_promise(__value)) return `
            <img src="${"/gifs/spinner.gif"}" alt="${""}" style="${"margin: auto"}">
        `;

		return (function (profile) {
			return `
            
            <div class="${"col-md-3"}"><div><img src="${"//placehold.it/100"}" class="${"avatar img-circle"}" alt="${"avatar"}"></div>
                ${isOwn
			? `<input type="${"submit"}" class="${"btn btn-primary svelte-ej0sbd"}" value="${"Edit brofile"}">`
			: ``}</div>
            
            
            <div class="${"col-md-9 personal-info"}"><h3>Personal info</h3>
                <div class="${"row"}"><div class="${"col-lg-2"}">First name:</div>
                    <div class="${"col-lg-6"}">${escape(profile.name)}</div></div>
                <div class="${"row"}"><div class="${"col-lg-2"}">Last name:</div>
                    <div class="${"col-lg-6"}">${escape(profile.surname)}</div></div>
                <div class="${"row"}"><div class="${"col-lg-2"}">Email:</div>
                    <div class="${"col-lg-6"}">${escape(profile.email)}</div></div>
                <div class="${"row"}"><div class="${"col-lg-2"}">Age:</div>
                    <div class="${"col-lg-6"}">${escape(profile.age)}</div></div>
                <div class="${"row"}"><div class="${"col-lg-2"}">Phone:</div>
                    <div class="${"col-lg-6"}">${escape(profile.phone)}</div></div></div>
        
        `;
		})(__value);
	})(profileService.getUserProfile(authService))}</div></div>`;
});

/* src/routes/Home.svelte generated by Svelte v3.24.0 */

const Home = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let visible = false;
	const authService = AuthService.getInstance();

	onMount(() => {
		authService.validateTokenAndNavigate().then(res => {
			if (res) {
				visible = true;
			}
		});
	});

	return `<div class="${"wrapper"}">${visible
	? `${validate_component(Link, "Link").$$render($$result, { to: "/gamiyole" }, {}, {
			default: () => `Gamiyole
        `
		})}
        ${validate_component(Link, "Link").$$render($$result, { to: "/gagiyoleb" }, {}, {
			default: () => `Gagiyoleb
        `
		})}`
	: `blaaaaaaaa`}</div>`;
});

/* src/routes/Gamiyole.svelte generated by Svelte v3.24.0 */

const css$3 = {
	code: ".wrapper.svelte-rnsfl4.svelte-rnsfl4{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-rnsfl4.svelte-rnsfl4{width:350px}form.svelte-rnsfl4 .action.svelte-rnsfl4{display:flex;justify-content:space-between;align-items:center}",
	map: "{\"version\":3,\"file\":\"Gamiyole.svelte\",\"sources\":[\"Gamiyole.svelte\"],\"sourcesContent\":[\"<script>\\nimport { onMount } from 'svelte';\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\nimport { GoogleService } from \\\"../services/google.service\\\";\\nimport { Link } from 'svelte-routing';\\nimport { AuthService } from \\\"../services/auth.service\\\";\\n\\nconst googleService = GoogleService.getInstance();\\nconst authService = AuthService.getInstance();\\n\\nconst dateHours = new Date().getHours();\\nconst dateMinutes = new Date().getMinutes();\\nlet fromUni,\\n  destination = \\\"\\\",\\n  seats = 1,\\n  startTime =\\n    (dateHours < 10 ? \\\"0\\\" : \\\"\\\") +\\n    dateHours +\\n    \\\":\\\" +\\n    (dateMinutes < 10 ? \\\"0\\\" : \\\"\\\") +\\n    dateMinutes,\\n  endTime =\\n    (dateHours < 10 ? \\\"0\\\" : \\\"\\\") +\\n    dateHours +\\n    \\\":\\\" +\\n    (dateMinutes < 10 ? \\\"0\\\" : \\\"\\\") +\\n    dateMinutes;\\nlet predictions = [];\\nlet clicked = false;\\n\\n$: {\\n  console.log(startTime, endTime);\\n}\\n\\nonMount(async () => {\\n  authService.validateTokenAndNavigate().then(res => {\\n  });\\n\\n  const url = new URL(location.href);\\n  const startTimeFromQuery = url.searchParams.get('startTime');\\n  const endTimeFromQuery = url.searchParams.get('endTime');\\n  const destinationFromQuery = url.searchParams.get('destination');\\n  console.log('destinationFromQuery', destinationFromQuery);\\n\\n  if(destinationFromQuery) {\\n    destination = destinationFromQuery;\\n  }\\n  if(startTimeFromQuery) {\\n    startTime = startTimeFromQuery;\\n  }\\n  if(endTimeFromQuery) {\\n    endTime = endTimeFromQuery;\\n  }\\n});\\n\\nif (DeviceDetectorService.isBrowser && window.navigator) {\\n  isAtUni();\\n}\\n\\nfunction isAtUni() {\\n  let lat, lng;\\n  navigator.geolocation.getCurrentPosition(pos => {\\n    lat = pos.coords.latitude;\\n    lng = pos.coords.longitude;\\n\\n    const distanceFromCenter = Math.sqrt(\\n      Math.pow(lat - DeviceDetectorService.latUni, 2) +\\n        Math.pow(lng - DeviceDetectorService.lngUni, 2)\\n    );\\n\\n    if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {\\n      fromUni = true;\\n    } else {\\n      fromUni = false;\\n    }\\n  });\\n}\\n\\nfunction onSubmit() {\\n  console.log(\\\"submit\\\");\\n}\\n\\nfunction getAutoCompletedData() {\\n  if (DeviceDetectorService.isBrowser) {\\n    googleService.getSuggestedPlaces(destination).then(res => {\\n      predictions = res;\\n    });\\n  }\\n}\\n</script>\\n\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}</style>\\n\\n<div class=\\\"wrapper\\\">\\n  <form>\\n    <div class=\\\"form-group\\\">\\n      <label>{fromUni ? 'To' : 'From'}</label>\\n      <input\\n        bind:value={destination}\\n        type=\\\"search\\\"\\n        class=\\\"form-control\\\"\\n        placeholder={fromUni ? 'To' : 'From'}\\n        on:input={res => {\\n          getAutoCompletedData();\\n          clicked = false;\\n        }} />\\n    </div>\\n    {#if destination !== '' && !clicked}\\n      <div>\\n        {#each predictions as prediction}\\n          <input\\n            type=\\\"text\\\"\\n            class=\\\"form-control\\\"\\n            value=\\\"{prediction}/\\\"\\n            readonly\\n            on:click={res => {\\n              destination = prediction;\\n              clicked = true;\\n            }} />\\n        {/each}\\n      </div>\\n    {/if}\\n    <div>\\n      {#if destination === ''}\\n        <Link to=\\\"/map?startTime={startTime}&endTime={endTime}\\\">Pick on Map</Link>\\n        {:else}\\n        <Link to=\\\"/map?destination={destination}&startTime={startTime}&endTime={endTime}\\\">Show on Map</Link>\\n      {/if}\\n    </div>\\n    <div class=\\\"form-group\\\">\\n      <label>From</label>\\n      <input\\n        bind:value={startTime}\\n        type=\\\"time\\\"\\n        class=\\\"form-control\\\"\\n        placeholder=\\\"From\\\" />\\n    </div>\\n    <div class=\\\"form-group\\\">\\n      <label>To</label>\\n      <input\\n        bind:value={endTime}\\n        type=\\\"time\\\"\\n        class=\\\"form-control\\\"\\n        placeholder=\\\"To\\\" />\\n    </div>\\n    <div class=\\\"action\\\">\\n      <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click={onSubmit}>\\n        Gamiyole\\n      </button>\\n    </div>\\n  </form>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AA2FmB,QAAQ,4BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,kBAAI,CAAC,OAAO,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC\"}"
};

const Gamiyole = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const googleService = GoogleService.getInstance();
	const authService = AuthService.getInstance();
	const dateHours = new Date().getHours();
	const dateMinutes = new Date().getMinutes();

	let fromUni,
		destination = "",
		startTime = (dateHours < 10 ? "0" : "") + dateHours + ":" + (dateMinutes < 10 ? "0" : "") + dateMinutes,
		endTime = (dateHours < 10 ? "0" : "") + dateHours + ":" + (dateMinutes < 10 ? "0" : "") + dateMinutes;

	let predictions = [];
	let clicked = false;

	onMount(async () => {
		authService.validateTokenAndNavigate().then(res => {
			
		});

		const url = new URL(location.href);
		const startTimeFromQuery = url.searchParams.get("startTime");
		const endTimeFromQuery = url.searchParams.get("endTime");
		const destinationFromQuery = url.searchParams.get("destination");
		console.log("destinationFromQuery", destinationFromQuery);

		if (destinationFromQuery) {
			destination = destinationFromQuery;
		}

		if (startTimeFromQuery) {
			startTime = startTimeFromQuery;
		}

		if (endTimeFromQuery) {
			endTime = endTimeFromQuery;
		}
	});

	if (DeviceDetectorService.isBrowser && window.navigator) {
		isAtUni();
	}

	function isAtUni() {
		let lat, lng;

		navigator.geolocation.getCurrentPosition(pos => {
			lat = pos.coords.latitude;
			lng = pos.coords.longitude;
			const distanceFromCenter = Math.sqrt(Math.pow(lat - DeviceDetectorService.latUni, 2) + Math.pow(lng - DeviceDetectorService.lngUni, 2));

			if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {
				fromUni = true;
			} else {
				fromUni = false;
			}
		});
	}

	$$result.css.add(css$3);

	 {
		{
			console.log(startTime, endTime);
		}
	}

	return `<div class="${"wrapper svelte-rnsfl4"}"><form class="${"svelte-rnsfl4"}"><div class="${"form-group"}"><label>${escape(fromUni ? "To" : "From")}</label>
      <input type="${"search"}" class="${"form-control"}"${add_attribute("placeholder", fromUni ? "To" : "From", 0)}${add_attribute("value", destination, 1)}></div>
    ${destination !== "" && !clicked
	? `<div>${each(predictions, prediction => `<input type="${"text"}" class="${"form-control"}" value="${escape(prediction) + "/"}" readonly>`)}</div>`
	: ``}
    <div>${destination === ""
	? `${validate_component(Link, "Link").$$render(
			$$result,
			{
				to: "/map?startTime=" + startTime + "&endTime=" + endTime
			},
			{},
			{ default: () => `Pick on Map` }
		)}`
	: `${validate_component(Link, "Link").$$render(
			$$result,
			{
				to: "/map?destination=" + destination + "&startTime=" + startTime + "&endTime=" + endTime
			},
			{},
			{ default: () => `Show on Map` }
		)}`}</div>
    <div class="${"form-group"}"><label>From</label>
      <input type="${"time"}" class="${"form-control"}" placeholder="${"From"}"${add_attribute("value", startTime, 1)}></div>
    <div class="${"form-group"}"><label>To</label>
      <input type="${"time"}" class="${"form-control"}" placeholder="${"To"}"${add_attribute("value", endTime, 1)}></div>
    <div class="${"action svelte-rnsfl4"}"><button type="${"button"}" class="${"btn btn-primary"}">Gamiyole
      </button></div></form></div>`;
});

/* src/routes/Gagiyoleb.svelte generated by Svelte v3.24.0 */

const css$4 = {
	code: ".wrapper.svelte-rnsfl4.svelte-rnsfl4{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-rnsfl4.svelte-rnsfl4{width:350px}form.svelte-rnsfl4 .action.svelte-rnsfl4{display:flex;justify-content:space-between;align-items:center}",
	map: "{\"version\":3,\"file\":\"Gagiyoleb.svelte\",\"sources\":[\"Gagiyoleb.svelte\"],\"sourcesContent\":[\"<script>\\nimport { onMount } from 'svelte';\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\nimport { GoogleService } from \\\"../services/google.service\\\";\\nimport { Link } from \\\"svelte-routing\\\";\\nimport { AuthService } from \\\"../services/auth.service\\\";\\n\\nconst googleService = GoogleService.getInstance();\\nconst authService = AuthService.getInstance();\\n\\nconst dateHours = new Date().getHours();\\nconst dateMinutes = new Date().getMinutes();\\nlet fromUni,\\n  destination = \\\"\\\",\\n  seats = 1,\\n  time =\\n    (dateHours < 10 ? \\\"0\\\" : \\\"\\\") +\\n    dateHours +\\n    \\\":\\\" +\\n    (dateMinutes < 10 ? \\\"0\\\" : \\\"\\\") +\\n    dateMinutes;\\nlet predictions = [];\\nlet clicked = false;\\n\\n$: {\\n  console.log(time);\\n}\\n\\n$: {\\n  if(seats <= 1) {\\n    seats = 1;\\n  }\\n}\\n\\nonMount(async () => {\\n  authService.validateTokenAndNavigate().then(res => {\\n  });\\n\\n  const url = new URL(location.href);\\n  const timeFromQuery = url.searchParams.get('time');\\n  const seatsFromQuery = url.searchParams.get('seats');\\n  const destinationFromQuery = url.searchParams.get('destination');\\n  console.log('destinationFromQuery', destinationFromQuery);\\n\\n  if(destinationFromQuery) {\\n    destination = destinationFromQuery;\\n  }\\n  if(timeFromQuery) {\\n    time = timeFromQuery;\\n  }\\n  if(seatsFromQuery) {\\n    seats = seatsFromQuery;\\n  }\\n});\\n\\n\\nif (DeviceDetectorService.isBrowser && window.navigator) {\\n  isAtUni();\\n}\\n\\nfunction isAtUni() {\\n  let lat, lng;\\n  navigator.geolocation.getCurrentPosition((pos) => {\\n    lat = pos.coords.latitude;\\n    lng = pos.coords.longitude;\\n\\n    const distanceFromCenter = Math.sqrt(\\n      Math.pow(lat - DeviceDetectorService.latUni, 2) +\\n        Math.pow(lng - DeviceDetectorService.lngUni, 2)\\n    );\\n\\n    if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {\\n      fromUni = true;\\n    } else {\\n      fromUni = false;\\n    }\\n  });\\n}\\n\\nfunction onSubmit() {\\n  console.log(\\\"submit\\\");\\n}\\n\\nfunction getAutoCompletedData() {\\n  if (DeviceDetectorService.isBrowser) {\\n    googleService.getSuggestedPlaces(destination).then((res) => {\\n      predictions = res;\\n    });\\n  }\\n}\\n</script>\\n\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}</style>\\n\\n<div class=\\\"wrapper\\\">\\n  <form>\\n    <div class=\\\"form-group\\\">\\n      <label>{fromUni ? 'To' : 'From'}</label>\\n      <input\\n        bind:value={destination}\\n        type=\\\"search\\\"\\n        class=\\\"form-control\\\"\\n        placeholder={fromUni ? 'To' : 'From'}\\n        on:input={(res) => {\\n          getAutoCompletedData();\\n          clicked = false;\\n        }} />\\n    </div>\\n    {#if destination !== '' && !clicked}\\n      <div>\\n        {#each predictions as prediction}\\n          <input\\n            type=\\\"text\\\"\\n            class=\\\"form-control\\\"\\n            value=\\\"{prediction}/\\\"\\n            readonly\\n            on:click={(res) => {\\n              destination = prediction;\\n              clicked = true;\\n            }} />\\n        {/each}\\n      </div>\\n    {/if}\\n    <div>\\n      {#if destination === ''}\\n        <Link to=\\\"/map?time={time}&seats={seats}\\\">Pick on Map</Link>\\n      {:else}\\n        <Link to=\\\"/map?destination={destination}&time={time}&seats={seats}\\\">Show on Map</Link>\\n      {/if}\\n    </div>\\n    <div class=\\\"form-group\\\">\\n      <label>Time</label>\\n      <input\\n        bind:value={time}\\n        type=\\\"time\\\"\\n        class=\\\"form-control\\\"\\n        placeholder=\\\"Time\\\" />\\n    </div>\\n    <div class=\\\"form-group\\\">\\n      <label>Number of Seats</label>\\n      <input\\n        bind:value={seats}\\n        type=\\\"number\\\"\\n        class=\\\"form-control\\\"\\n        placeholder=\\\"Number of Seats\\\" />\\n    </div>\\n    <div class=\\\"action\\\">\\n      <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click={onSubmit}>\\n        Gagiyoleb\\n      </button>\\n    </div>\\n  </form>\\n</div>\\n\"],\"names\":[],\"mappings\":\"AA4FmB,QAAQ,4BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,kBAAI,CAAC,OAAO,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC\"}"
};

const Gagiyoleb = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const googleService = GoogleService.getInstance();
	const authService = AuthService.getInstance();
	const dateHours = new Date().getHours();
	const dateMinutes = new Date().getMinutes();

	let fromUni,
		destination = "",
		seats = 1,
		time = (dateHours < 10 ? "0" : "") + dateHours + ":" + (dateMinutes < 10 ? "0" : "") + dateMinutes;

	let predictions = [];
	let clicked = false;

	onMount(async () => {
		authService.validateTokenAndNavigate().then(res => {
			
		});

		const url = new URL(location.href);
		const timeFromQuery = url.searchParams.get("time");
		const seatsFromQuery = url.searchParams.get("seats");
		const destinationFromQuery = url.searchParams.get("destination");
		console.log("destinationFromQuery", destinationFromQuery);

		if (destinationFromQuery) {
			destination = destinationFromQuery;
		}

		if (timeFromQuery) {
			time = timeFromQuery;
		}

		if (seatsFromQuery) {
			seats = seatsFromQuery;
		}
	});

	if (DeviceDetectorService.isBrowser && window.navigator) {
		isAtUni();
	}

	function isAtUni() {
		let lat, lng;

		navigator.geolocation.getCurrentPosition(pos => {
			lat = pos.coords.latitude;
			lng = pos.coords.longitude;
			const distanceFromCenter = Math.sqrt(Math.pow(lat - DeviceDetectorService.latUni, 2) + Math.pow(lng - DeviceDetectorService.lngUni, 2));

			if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {
				fromUni = true;
			} else {
				fromUni = false;
			}
		});
	}

	$$result.css.add(css$4);

	 {
		{
			console.log(time);
		}
	}

	 {
		{
			if (seats <= 1) {
				seats = 1;
			}
		}
	}

	return `<div class="${"wrapper svelte-rnsfl4"}"><form class="${"svelte-rnsfl4"}"><div class="${"form-group"}"><label>${escape(fromUni ? "To" : "From")}</label>
      <input type="${"search"}" class="${"form-control"}"${add_attribute("placeholder", fromUni ? "To" : "From", 0)}${add_attribute("value", destination, 1)}></div>
    ${destination !== "" && !clicked
	? `<div>${each(predictions, prediction => `<input type="${"text"}" class="${"form-control"}" value="${escape(prediction) + "/"}" readonly>`)}</div>`
	: ``}
    <div>${destination === ""
	? `${validate_component(Link, "Link").$$render(
			$$result,
			{
				to: "/map?time=" + time + "&seats=" + seats
			},
			{},
			{ default: () => `Pick on Map` }
		)}`
	: `${validate_component(Link, "Link").$$render(
			$$result,
			{
				to: "/map?destination=" + destination + "&time=" + time + "&seats=" + seats
			},
			{},
			{ default: () => `Show on Map` }
		)}`}</div>
    <div class="${"form-group"}"><label>Time</label>
      <input type="${"time"}" class="${"form-control"}" placeholder="${"Time"}"${add_attribute("value", time, 1)}></div>
    <div class="${"form-group"}"><label>Number of Seats</label>
      <input type="${"number"}" class="${"form-control"}" placeholder="${"Number of Seats"}"${add_attribute("value", seats, 1)}></div>
    <div class="${"action svelte-rnsfl4"}"><button type="${"button"}" class="${"btn btn-primary"}">Gagiyoleb
      </button></div></form></div>`;
});

/* src/components/Map.svelte generated by Svelte v3.24.0 */

const css$5 = {
	code: ".full-screen.svelte-17pn0o7{width:100vw;height:90vh}",
	map: "{\"version\":3,\"file\":\"Map.svelte\",\"sources\":[\"Map.svelte\"],\"sourcesContent\":[\"<script>\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\nimport { Link } from \\\"svelte-routing\\\";\\nimport { GoogleService } from '../services/google.service';\\nimport { onMount } from \\\"svelte\\\";\\nimport { navigate } from 'svelte-routing';\\n\\nconst googleService = GoogleService.getInstance();\\nlet container;\\nlet map;\\nlet zoom = 16;\\nlet center = { lat: DeviceDetectorService.latUni, lng: DeviceDetectorService.lngUni };\\nlet directionsService;\\nlet directionsRenderer;\\nlet geoCoder;\\nlet count = 0;\\nlet startLocation;\\nlet endLocation;\\nlet marker;\\n\\n\\nonMount(async () => {\\n  const url = new URL(location.href);\\n  const destination = url.searchParams.get('destination');\\n  \\n  if(destination) {\\n    const res = await googleService.getGeometryForPlace(destination);\\n    if(res.candidates.length !== 0) {\\n      center = res.candidates[0].geometry.location;\\n    }\\n  }\\n\\n  geoCoder = new google.maps.Geocoder();\\n  directionsService = new google.maps.DirectionsService();\\n  directionsRenderer = new google.maps.DirectionsRenderer();\\n  map = new google.maps.Map(container, {\\n    zoom,\\n    center\\n  });\\n  marker = new google.maps.Marker({\\n      map: map,\\n      position: center,\\n      draggable: true\\n  });\\n  window.marker = marker;\\n  map.addListener(\\\"click\\\", function(mapsMouseEvent) {\\n      marker.setPosition(mapsMouseEvent.latLng)\\n  });\\n  directionsRenderer.setMap(map);\\n});\\n\\nfunction onSubmit() {\\n  const url = new URL(location.href);\\n  const startTime = url.searchParams.get('startTime');\\n  const endTime = url.searchParams.get('endTime');\\n  const time = url.searchParams.get('time');\\n  const seats = url.searchParams.get('seats');\\n  let destination;\\n\\n  geoCoder.geocode({\\n      location: {\\n        lat: marker.getPosition().lat(),\\n        lng: marker.getPosition().lng()\\n      }\\n    }, (results, status) => {\\n      if (status === \\\"OK\\\") {\\n        if (results[0]) {\\n          console.log(results);\\n          destination = results[0].formatted_address;\\n          console.log(destination);\\n          if(startTime && endTime) {\\n            // Came from Gamiyole\\n            navigate(`/gamiyole?destination=${destination}&startTime=${startTime}&endTime=${endTime}`);\\n          } else {\\n            // Came from Gagiyole\\n            navigate(`/gagiyoleb?destination=${destination}&time=${time}&seats=${seats}`);\\n          }\\n        } else {\\n          window.alert(\\\"No results found\\\");\\n        }\\n      } else {\\n        window.alert(\\\"Geocoder failed due to: \\\" + status);\\n      }\\n  });\\n\\n}\\n\\n</script>\\n\\n<style>\\n.full-screen {\\n  width: 100vw;\\n  height: 90vh;\\n}\\n</style>\\n\\n<div class=\\\"full-screen\\\" bind:this={container} />\\n<button on:click={onSubmit}>Submit</button>\\n\"],\"names\":[],\"mappings\":\"AA0FA,YAAY,eAAC,CAAC,AACZ,KAAK,CAAE,KAAK,CACZ,MAAM,CAAE,IAAI,AACd,CAAC\"}"
};

let zoom = 16;

const Map$1 = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const googleService = GoogleService.getInstance();
	let container;
	let map;

	let center = {
		lat: DeviceDetectorService.latUni,
		lng: DeviceDetectorService.lngUni
	};

	let directionsService;
	let directionsRenderer;
	let geoCoder;
	let marker;

	onMount(async () => {
		const url = new URL(location.href);
		const destination = url.searchParams.get("destination");

		if (destination) {
			const res = await googleService.getGeometryForPlace(destination);

			if (res.candidates.length !== 0) {
				center = res.candidates[0].geometry.location;
			}
		}

		geoCoder = new google.maps.Geocoder();
		directionsService = new google.maps.DirectionsService();
		directionsRenderer = new google.maps.DirectionsRenderer();
		map = new google.maps.Map(container, { zoom, center });
		marker = new google.maps.Marker({ map, position: center, draggable: true });
		window.marker = marker;

		map.addListener("click", function (mapsMouseEvent) {
			marker.setPosition(mapsMouseEvent.latLng);
		});

		directionsRenderer.setMap(map);
	});

	$$result.css.add(css$5);

	return `<div class="${"full-screen svelte-17pn0o7"}"${add_attribute("this", container, 1)}></div>
<button>Submit</button>`;
});

/* src/routes/MapApp.svelte generated by Svelte v3.24.0 */

const css$6 = {
	code: "body{padding:0}",
	map: "{\"version\":3,\"file\":\"MapApp.svelte\",\"sources\":[\"MapApp.svelte\"],\"sourcesContent\":[\"<script>\\nimport { onMount } from 'svelte';\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\nimport Map from \\\"../components/Map.svelte\\\";\\nimport { GoogleService } from \\\"../services/google.service\\\";\\nimport { AuthService } from \\\"../services/auth.service\\\";\\n\\nconst authService = AuthService.getInstance();\\n\\nlet isInitMap = false;\\n\\nonMount(async () => {\\n  authService.validateTokenAndNavigate().then(res => {\\n  });\\n});\\n\\nif(DeviceDetectorService.isBrowser) {\\n  for(let i=0; i<10; i++) {\\n    setTimeout(() => {\\n      isInitMap = window.isInitMap\\n    }, i*100);\\n  }\\n}\\n\\n</script>\\n\\n<style>\\n:global(body) {\\n  padding: 0;\\n}\\n</style>\\n\\n\\n{#if DeviceDetectorService.isBrowser && isInitMap}\\n  <Map />\\n{/if}\\n\"],\"names\":[],\"mappings\":\"AA2BQ,IAAI,AAAE,CAAC,AACb,OAAO,CAAE,CAAC,AACZ,CAAC\"}"
};

const MapApp = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const authService = AuthService.getInstance();
	let isInitMap = false;

	onMount(async () => {
		authService.validateTokenAndNavigate().then(res => {
			
		});
	});

	if (DeviceDetectorService.isBrowser) {
		for (let i = 0; i < 10; i++) {
			setTimeout(
				() => {
					isInitMap = window.isInitMap;
				},
				i * 100
			);
		}
	}

	$$result.css.add(css$6);

	return `${DeviceDetectorService.isBrowser && isInitMap
	? `${validate_component(Map$1, "Map").$$render($$result, {}, {}, {})}`
	: ``}`;
});

/* src/components/Navbar.svelte generated by Svelte v3.24.0 */

const css$7 = {
	code: ".nav-link.svelte-1d0go87{cursor:pointer}",
	map: "{\"version\":3,\"file\":\"Navbar.svelte\",\"sources\":[\"Navbar.svelte\"],\"sourcesContent\":[\"<script>\\nimport { navigate } from \\\"svelte-routing\\\";\\nimport { onMount } from \\\"svelte\\\";\\nimport { AuthService } from \\\"../services/auth.service\\\";\\n\\nconst Routes = [\\n    {\\n        route: '/login',\\n        label: 'Login'\\n    },\\n    {\\n        route: '/profile',\\n        label: 'profile'\\n    },\\n    {\\n        route: '/register',\\n        label: 'Register'\\n    },\\n    {\\n        route: '/gamiyole',\\n        label: 'Gamiyole'\\n    },\\n    {\\n        route: '/gagiyoleb',\\n        label: 'Gagiyoleb'\\n    }\\n];\\n\\nconst Routes_For_Authenticated_Users =[\\n    {\\n        route: '/logout',\\n        label: 'Logout',\\n        isLogout: true\\n    },\\n    {\\n        route: '/profile',\\n        label: 'profile'\\n    },\\n    {\\n        route: '/gamiyole',\\n        label: 'Gamiyole'\\n    },\\n    {\\n        route: '/gagiyoleb',\\n        label: 'Gagiyoleb'\\n    }\\n]\\n\\nlet currRoutes = Routes;\\nconst authService = AuthService.getInstance();\\n\\nonMount(async () => {\\n    authService.validateTokenAndNavigate().then(res => {\\n        if(res) currRoutes = Routes_For_Authenticated_Users;\\n        else currRoutes = Routes;\\n    });\\n});\\n\\nfunction onNavigate(route) {\\n    if (route.isLogout === true){\\n        authService.deleteToken();\\n        if (authService.getToken() === null) currRoutes = Routes; \\n    } else {\\n        navigate(route.route);\\n    }\\n}\\n\\n</script>\\n\\n<style>\\n.nav-link{\\n    cursor: pointer;\\n}\\n</style>\\n\\n<nav class=\\\"navbar navbar-expand-lg navbar-dark bg-dark\\\">\\n    <span class=\\\"navbar-brand\\\" on:click=\\\"{() => navigate(\\\"/\\\")}\\\">\\n      <svg id=\\\"Layer_3\\\" style=\\\"height: 40px; width: 40px; fill: white\\\" enable-background=\\\"new 0 0 64 64\\\" height=\\\"512\\\" viewBox=\\\"0 0 64 64\\\" width=\\\"512\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\"><g><path d=\\\"m21 51.721-4.923-1.641-1.077.538v2.382h6z\\\"/><path d=\\\"m43 59v2h4v-2.101c-.323.066-.658.101-1 .101z\\\"/><path d=\\\"m17 58.899v2.101h4v-2h-3c-.342 0-.677-.035-1-.101z\\\"/><path d=\\\"m43 51.721v1.279h6v-2.382l-1.077-.538z\\\"/><path d=\\\"m41 54v-3c0-.431.275-.812.684-.948l3.155-1.052h-25.678l3.155 1.052c.409.136.684.517.684.948v3c0 .553-.447 1-1 1h-6.816c.414 1.161 1.514 2 2.816 2h28c1.302 0 2.402-.839 2.816-2h-6.816c-.553 0-1-.447-1-1zm-2 1h-14v-2h14z\\\"/><path d=\\\"m15.586 47h-2.586v2h.764l2.548-1.274z\\\"/><path d=\\\"m47.688 47.726 2.548 1.274h.764v-2h-2.586z\\\"/><path d=\\\"m22.789 40.658-3.171 6.342h24.764l-3.171-6.342c-.512-1.022-1.54-1.658-2.683-1.658h-13.056c-1.143 0-2.171.636-2.683 1.658z\\\"/><path d=\\\"m34 11v-2c0-1.103-.897-2-2-2s-2 .897-2 2v2c0 1.103.897 2 2 2s2-.897 2-2z\\\"/><path d=\\\"m26 18v2.981c.617.465 1.284.865 2 1.178v-3.159h2v3.798c.646.132 1.315.202 2 .202s1.354-.07 2-.202v-3.798h2v3.159c.716-.314 1.383-.713 2-1.178v-2.981c0-1.654-1.346-3-3-3h-6c-1.654 0-3 1.346-3 3z\\\"/><path d=\\\"m24 18c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v.974c1.25-1.669 2-3.733 2-5.974 0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974z\\\"/><path d=\\\"m9 26v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v1.974c1.25-1.669 2-3.733 2-5.974 0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974v-1.974c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043z\\\"/><path d=\\\"m13 39c.685 0 1.354-.07 2-.202v-4.798h2v4.159c.716-.314 1.383-.713 2-1.178v-3.981c0-1.654-1.346-3-3-3h-6c-1.654 0-3 1.346-3 3v3.981c.617.465 1.284.865 2 1.178v-4.159h2v4.798c.646.132 1.315.202 2 .202z\\\"/><path d=\\\"m11 24v2c0 1.103.897 2 2 2s2-.897 2-2v-2c0-1.103-.897-2-2-2s-2 .897-2 2z\\\"/><path d=\\\"m61 29c0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974v-1.974c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v1.974c1.25-1.669 2-3.733 2-5.974z\\\"/><path d=\\\"m54 30h-6c-1.654 0-3 1.346-3 3v3.981c.617.465 1.284.865 2 1.178v-4.159h2v4.798c.646.132 1.315.202 2 .202s1.354-.07 2-.202v-4.798h2v4.159c.716-.314 1.383-.713 2-1.178v-3.981c0-1.654-1.346-3-3-3z\\\"/><path d=\\\"m53 26v-2c0-1.103-.897-2-2-2s-2 .897-2 2v2c0 1.103.897 2 2 2s2-.897 2-2z\\\"/></g></svg>\\n    </span>\\n    <button class=\\\"navbar-toggler\\\" type=\\\"button\\\" data-toggle=\\\"collapse\\\" data-target=\\\"#navbarNav\\\" aria-controls=\\\"navbarNav\\\" aria-expanded=\\\"false\\\" aria-label=\\\"Toggle navigation\\\">\\n      <span class=\\\"navbar-toggler-icon\\\"></span>\\n    </button>\\n    <div class=\\\"collapse navbar-collapse\\\" id=\\\"navbarNav\\\">\\n      <ul class=\\\"navbar-nav\\\">\\n        {#each currRoutes as route}\\n            <li class=\\\"nav-item\\\">\\n                <span \\n                    class=\\\"{route.isLogout !== undefined ? 'nav-link text-danger' : 'nav-link'}\\\" \\n                    on:click=\\\"{() => onNavigate(route)}\\\"\\n                >{route.label}</span>\\n            </li>\\n        {/each}\\n      </ul>\\n    </div>\\n</nav>\"],\"names\":[],\"mappings\":\"AAsEA,wBAAS,CAAC,AACN,MAAM,CAAE,OAAO,AACnB,CAAC\"}"
};

const Navbar = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const Routes = [
		{ route: "/login", label: "Login" },
		{ route: "/profile", label: "profile" },
		{ route: "/register", label: "Register" },
		{ route: "/gamiyole", label: "Gamiyole" },
		{ route: "/gagiyoleb", label: "Gagiyoleb" }
	];

	const Routes_For_Authenticated_Users = [
		{
			route: "/logout",
			label: "Logout",
			isLogout: true
		},
		{ route: "/profile", label: "profile" },
		{ route: "/gamiyole", label: "Gamiyole" },
		{ route: "/gagiyoleb", label: "Gagiyoleb" }
	];

	let currRoutes = Routes;
	const authService = AuthService.getInstance();

	onMount(async () => {
		authService.validateTokenAndNavigate().then(res => {
			if (res) currRoutes = Routes_For_Authenticated_Users; else currRoutes = Routes;
		});
	});

	$$result.css.add(css$7);

	return `<nav class="${"navbar navbar-expand-lg navbar-dark bg-dark"}"><span class="${"navbar-brand"}"><svg id="${"Layer_3"}" style="${"height: 40px; width: 40px; fill: white"}" enable-background="${"new 0 0 64 64"}" height="${"512"}" viewBox="${"0 0 64 64"}" width="${"512"}" xmlns="${"http://www.w3.org/2000/svg"}"><g><path d="${"m21 51.721-4.923-1.641-1.077.538v2.382h6z"}"></path><path d="${"m43 59v2h4v-2.101c-.323.066-.658.101-1 .101z"}"></path><path d="${"m17 58.899v2.101h4v-2h-3c-.342 0-.677-.035-1-.101z"}"></path><path d="${"m43 51.721v1.279h6v-2.382l-1.077-.538z"}"></path><path d="${"m41 54v-3c0-.431.275-.812.684-.948l3.155-1.052h-25.678l3.155 1.052c.409.136.684.517.684.948v3c0 .553-.447 1-1 1h-6.816c.414 1.161 1.514 2 2.816 2h28c1.302 0 2.402-.839 2.816-2h-6.816c-.553 0-1-.447-1-1zm-2 1h-14v-2h14z"}"></path><path d="${"m15.586 47h-2.586v2h.764l2.548-1.274z"}"></path><path d="${"m47.688 47.726 2.548 1.274h.764v-2h-2.586z"}"></path><path d="${"m22.789 40.658-3.171 6.342h24.764l-3.171-6.342c-.512-1.022-1.54-1.658-2.683-1.658h-13.056c-1.143 0-2.171.636-2.683 1.658z"}"></path><path d="${"m34 11v-2c0-1.103-.897-2-2-2s-2 .897-2 2v2c0 1.103.897 2 2 2s2-.897 2-2z"}"></path><path d="${"m26 18v2.981c.617.465 1.284.865 2 1.178v-3.159h2v3.798c.646.132 1.315.202 2 .202s1.354-.07 2-.202v-3.798h2v3.159c.716-.314 1.383-.713 2-1.178v-2.981c0-1.654-1.346-3-3-3h-6c-1.654 0-3 1.346-3 3z"}"></path><path d="${"m24 18c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v.974c1.25-1.669 2-3.733 2-5.974 0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974z"}"></path><path d="${"m9 26v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v1.974c1.25-1.669 2-3.733 2-5.974 0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974v-1.974c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043z"}"></path><path d="${"m13 39c.685 0 1.354-.07 2-.202v-4.798h2v4.159c.716-.314 1.383-.713 2-1.178v-3.981c0-1.654-1.346-3-3-3h-6c-1.654 0-3 1.346-3 3v3.981c.617.465 1.284.865 2 1.178v-4.159h2v4.798c.646.132 1.315.202 2 .202z"}"></path><path d="${"m11 24v2c0 1.103.897 2 2 2s2-.897 2-2v-2c0-1.103-.897-2-2-2s-2 .897-2 2z"}"></path><path d="${"m61 29c0-5.514-4.486-10-10-10s-10 4.486-10 10c0 2.241.75 4.305 2 5.974v-1.974c0-2.613 2.022-4.74 4.579-4.957-.359-.6-.579-1.294-.579-2.043v-2c0-2.206 1.794-4 4-4s4 1.794 4 4v2c0 .749-.22 1.443-.579 2.043 2.557.217 4.579 2.344 4.579 4.957v1.974c1.25-1.669 2-3.733 2-5.974z"}"></path><path d="${"m54 30h-6c-1.654 0-3 1.346-3 3v3.981c.617.465 1.284.865 2 1.178v-4.159h2v4.798c.646.132 1.315.202 2 .202s1.354-.07 2-.202v-4.798h2v4.159c.716-.314 1.383-.713 2-1.178v-3.981c0-1.654-1.346-3-3-3z"}"></path><path d="${"m53 26v-2c0-1.103-.897-2-2-2s-2 .897-2 2v2c0 1.103.897 2 2 2s2-.897 2-2z"}"></path></g></svg></span>
    <button class="${"navbar-toggler"}" type="${"button"}" data-toggle="${"collapse"}" data-target="${"#navbarNav"}" aria-controls="${"navbarNav"}" aria-expanded="${"false"}" aria-label="${"Toggle navigation"}"><span class="${"navbar-toggler-icon"}"></span></button>
    <div class="${"collapse navbar-collapse"}" id="${"navbarNav"}"><ul class="${"navbar-nav"}">${each(currRoutes, route => `<li class="${"nav-item"}"><span class="${escape(null_to_empty(route.isLogout !== undefined
	? "nav-link text-danger"
	: "nav-link")) + " svelte-1d0go87"}">${escape(route.label)}</span>
            </li>`)}</ul></div></nav>`;
});

/* src/routes/ProfileEdit.svelte generated by Svelte v3.24.0 */

const css$8 = {
	code: ".row.svelte-y6grfm{margin:20px 0}",
	map: "{\"version\":3,\"file\":\"ProfileEdit.svelte\",\"sources\":[\"ProfileEdit.svelte\"],\"sourcesContent\":[\"<script lang=\\\"typescript\\\">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\\n    return new (P || (P = Promise))(function (resolve, reject) {\\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\\n        function rejected(value) { try { step(generator[\\\"throw\\\"](value)); } catch (e) { reject(e); } }\\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\\n    });\\n};\\nimport { onMount } from \\\"svelte\\\";\\nimport { AuthService } from \\\"../services/auth.service\\\";\\nimport { ProfileService } from \\\"../services/profile.service\\\";\\nimport { navigate } from \\\"svelte-routing\\\";\\nconst authService = AuthService.getInstance();\\nlet profile = {\\n    name: '',\\n    phone: '',\\n    email: '',\\n    age: 0,\\n    surname: ''\\n};\\nlet profileSnapShot;\\nonMount(() => __awaiter(void 0, void 0, void 0, function* () {\\n    authService.validateTokenAndNavigate().then(res => {\\n    });\\n    profile = yield profileService.getUserProfile(authService);\\n    profileSnapShot = Object.assign({}, profile);\\n}));\\nconst profileService = ProfileService.getInstance();\\nfunction saveChanges() {\\n    profileService.updateUserProfile(profile, authService).then(() => console.log('he'));\\n}\\nfunction reset() {\\n    profile = Object.assign({}, profileSnapShot);\\n}\\n</script>\\n\\n<style type=\\\"text/scss\\\">.row {\\n  margin: 20px 0;\\n}</style>\\n\\n<div class=\\\"container\\\">\\n    <h1>Profile</h1>\\n    <hr>\\n    <div class=\\\"row\\\">\\n        <!-- left column -->\\n        <div class=\\\"col-md-3\\\">\\n        <div class=\\\"text-center\\\">\\n            <img src=\\\"//placehold.it/100\\\" class=\\\"avatar img-circle\\\" alt=\\\"avatar\\\">\\n        </div>\\n        </div>\\n        \\n        <!-- edit form column -->\\n        <div class=\\\"col-md-9 personal-info\\\">\\n            <h3>Personal info</h3>\\n            <form role=\\\"form\\\" on:submit|preventDefault={saveChanges}>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">First name:</div>\\n                    <div class=\\\"col-lg-6\\\">\\n                        <input class=\\\"form-control\\\" type=\\\"text\\\" bind:value=\\\"{profile.name}\\\">\\n                    </div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Last name:</div>\\n                    <div class=\\\"col-lg-6\\\">\\n                        <input class=\\\"form-control\\\" type=\\\"text\\\" bind:value=\\\"{profile.surname}\\\">\\n                    </div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Email:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.email}</div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Age:</div>\\n                    <div class=\\\"col-lg-6\\\">{profile.age}</div>\\n                </div>\\n                <div class=\\\"row\\\">\\n                    <div class=\\\"col-lg-2\\\">Phone:</div>\\n                    <div class=\\\"col-lg-6\\\">\\n                        <input class=\\\"form-control\\\" type=\\\"text\\\" bind:value=\\\"{profile.phone}\\\">\\n                    </div>\\n                </div>\\n                <div class=\\\"col-md-8\\\">\\n                    <input type=\\\"submit\\\" class=\\\"btn btn-primary\\\" value=\\\"Save Changes\\\">\\n                    <span></span>\\n                    <input type=\\\"reset\\\" on:click=\\\"{() => reset()}\\\" class=\\\"btn btn-default\\\" value=\\\"Cancel\\\">\\n                </div>\\n            </form>\\n        </div>\\n    </div>\\n</div>\\n\\n\"],\"names\":[],\"mappings\":\"AAqCwB,IAAI,cAAC,CAAC,AAC5B,MAAM,CAAE,IAAI,CAAC,CAAC,AAChB,CAAC\"}"
};

const ProfileEdit = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
			? value
			: new P(function (resolve) {
						resolve(value);
					});
		}

		return new (P || (P = Promise))(function (resolve, reject) {
				function fulfilled(value) {
					try {
						step(generator.next(value));
					} catch(e) {
						reject(e);
					}
				}

				function rejected(value) {
					try {
						step(generator["throw"](value));
					} catch(e) {
						reject(e);
					}
				}

				function step(result) {
					result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
				}

				step((generator = generator.apply(thisArg, _arguments || [])).next());
			});
	};

	const authService = AuthService.getInstance();

	let profile = {
		name: "",
		phone: "",
		email: "",
		age: 0,
		surname: ""
	};

	let profileSnapShot;

	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
		authService.validateTokenAndNavigate().then(res => {
			
		});

		profile = yield profileService.getUserProfile(authService);
		profileSnapShot = Object.assign({}, profile);
	}));

	const profileService = ProfileService.getInstance();

	$$result.css.add(css$8);

	return `<div class="${"container"}"><h1>Profile</h1>
    <hr>
    <div class="${"row svelte-y6grfm"}">
        <div class="${"col-md-3"}"><div class="${"text-center"}"><img src="${"//placehold.it/100"}" class="${"avatar img-circle"}" alt="${"avatar"}"></div></div>
        
        
        <div class="${"col-md-9 personal-info"}"><h3>Personal info</h3>
            <form role="${"form"}"><div class="${"row svelte-y6grfm"}"><div class="${"col-lg-2"}">First name:</div>
                    <div class="${"col-lg-6"}"><input class="${"form-control"}" type="${"text"}"${add_attribute("value", profile.name, 1)}></div></div>
                <div class="${"row svelte-y6grfm"}"><div class="${"col-lg-2"}">Last name:</div>
                    <div class="${"col-lg-6"}"><input class="${"form-control"}" type="${"text"}"${add_attribute("value", profile.surname, 1)}></div></div>
                <div class="${"row svelte-y6grfm"}"><div class="${"col-lg-2"}">Email:</div>
                    <div class="${"col-lg-6"}">${escape(profile.email)}</div></div>
                <div class="${"row svelte-y6grfm"}"><div class="${"col-lg-2"}">Age:</div>
                    <div class="${"col-lg-6"}">${escape(profile.age)}</div></div>
                <div class="${"row svelte-y6grfm"}"><div class="${"col-lg-2"}">Phone:</div>
                    <div class="${"col-lg-6"}"><input class="${"form-control"}" type="${"text"}"${add_attribute("value", profile.phone, 1)}></div></div>
                <div class="${"col-md-8"}"><input type="${"submit"}" class="${"btn btn-primary"}" value="${"Save Changes"}">
                    <span></span>
                    <input type="${"reset"}" class="${"btn btn-default"}" value="${"Cancel"}"></div></form></div></div></div>`;
});

/* src/App.svelte generated by Svelte v3.24.0 */

const App = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { url = "" } = $$props;
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);

	return `${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})}
${validate_component(Router, "Router").$$render($$result, { url }, {}, {
		default: () => `${validate_component(Route, "Route").$$render($$result, { path: "login", component: Login }, {}, {})}
	  ${validate_component(Route, "Route").$$render($$result, { path: "register", component: Register }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "profile", component: Profile }, {}, {})}
    ${validate_component(Route, "Route").$$render(
			$$result,
			{
				path: "profile/edit",
				component: ProfileEdit
			},
			{},
			{}
		)}
    ${validate_component(Route, "Route").$$render($$result, { path: "/", component: Home }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "gamiyole", component: Gamiyole }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "gagiyoleb", component: Gagiyoleb }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "map", component: MapApp }, {}, {})}`
	})}`;
});

module.exports = App;
