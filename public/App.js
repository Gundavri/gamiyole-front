'use strict';

function noop() { }
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

/* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.24.0 */

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

/* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.24.0 */

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

/* node_modules\svelte-routing\src\Link.svelte generated by Svelte v3.24.0 */

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

    setMapLoaded(flag) {
        this.mapLoaded = flag;
    }


}

/* src\routes\Login.svelte generated by Svelte v3.24.0 */

const css = {
	code: ".wrapper.svelte-rnsfl4.svelte-rnsfl4{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-rnsfl4.svelte-rnsfl4{width:350px}form.svelte-rnsfl4 .action.svelte-rnsfl4{display:flex;justify-content:space-between;align-items:center}",
	map: "{\"version\":3,\"file\":\"Login.svelte\",\"sources\":[\"Login.svelte\"],\"sourcesContent\":[\"<script lang=\\\"typescript\\\">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\\r\\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\\r\\n    return new (P || (P = Promise))(function (resolve, reject) {\\r\\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\\r\\n        function rejected(value) { try { step(generator[\\\"throw\\\"](value)); } catch (e) { reject(e); } }\\r\\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\\r\\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\\r\\n    });\\r\\n};\\r\\nimport { onMount } from 'svelte';\\r\\nimport { Link, navigate } from \\\"svelte-routing\\\";\\r\\nimport { AuthService } from '../services/auth.service';\\r\\nlet submitClicked = false;\\r\\nlet loginError = false;\\r\\nlet email = '', password = '';\\r\\nconst authService = AuthService.getInstance();\\r\\nonMount(() => {\\r\\n    authService.deleteToken();\\r\\n});\\r\\nfunction isValidInputs() {\\r\\n    return (email.length >= 6 && email.length <= 64) &&\\r\\n        (password.length >= 6 && password.length <= 64) &&\\r\\n        authService.emailRegex.test(email);\\r\\n}\\r\\nfunction onKeyup(event) {\\r\\n    if (event.keyCode === 13) {\\r\\n        onSubmit();\\r\\n    }\\r\\n}\\r\\nfunction onSubmit() {\\r\\n    return __awaiter(this, void 0, void 0, function* () {\\r\\n        submitClicked = true;\\r\\n        if (isValidInputs) {\\r\\n            let res = yield authService.login(email, password);\\r\\n            if (!res.error) {\\r\\n                authService.setToken(res.token);\\r\\n                navigate('/');\\r\\n            }\\r\\n            else {\\r\\n                loginError = true;\\r\\n            }\\r\\n        }\\r\\n    });\\r\\n}\\r\\n</script>\\r\\n\\r\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}</style>\\r\\n\\r\\n<div class=\\\"wrapper\\\">\\r\\n    <form>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputEmail1\\\">Email address</label>\\r\\n            <input bind:value={email} type=\\\"email\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputEmail1\\\" aria-describedby=\\\"emailHelp\\\" placeholder=\\\"Enter email\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if email.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is required*</span> \\r\\n            {/if}\\r\\n            {#if email.length !== 0 && email.length < 6 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is too short*</span> \\r\\n            {/if}\\r\\n            {#if email.length > 64 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is too long*</span> \\r\\n            {/if}\\r\\n            {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is not valid*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputPassword1\\\">Password</label>\\r\\n            <input bind:value={password} type=\\\"password\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputPassword1\\\" placeholder=\\\"Password\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if password.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Password is required*</span> \\r\\n            {/if}\\r\\n            {#if password.length !== 0 && password.length < 6 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Password is too short*</span> \\r\\n            {/if}\\r\\n            {#if password.length > 64 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Password is too long*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        {#if loginError && isValidInputs()}\\r\\n                <span class=\\\"error text-danger\\\">Email or Password is wrong*</span> \\r\\n        {/if}\\r\\n        <div class=\\\"action\\\">\\r\\n            <Link class=\\\"already\\\" to=\\\"/register\\\">\\r\\n                Not Registered Yet?\\r\\n            </Link>\\r\\n            <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click=\\\"{onSubmit}\\\">Login</button>\\r\\n        </div>\\r\\n    </form>\\r\\n</div>\"],\"names\":[],\"mappings\":\"AA8CmB,QAAQ,4BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,kBAAI,CAAC,OAAO,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC\"}"
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

/* src\routes\Register.svelte generated by Svelte v3.24.0 */

const css$1 = {
	code: ".wrapper.svelte-1cmpm85.svelte-1cmpm85{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-1cmpm85.svelte-1cmpm85{width:350px}form.svelte-1cmpm85 .action.svelte-1cmpm85{display:flex;justify-content:space-between;align-items:center}form.svelte-1cmpm85 .text-danger.svelte-1cmpm85{font-size:13px;font-style:italic}",
	map: "{\"version\":3,\"file\":\"Register.svelte\",\"sources\":[\"Register.svelte\"],\"sourcesContent\":[\"<script>\\r\\nimport { onMount } from 'svelte';\\r\\nimport { Link, navigate } from \\\"svelte-routing\\\";\\r\\nimport { AuthService } from '../services/auth.service';\\r\\n\\r\\nlet submitClicked = false;\\r\\nlet registerError = false;\\r\\nlet name = '', surname = '', email = '', password1 = '', password2 = '';\\r\\n\\r\\nconst authService = AuthService.getInstance();\\r\\n\\r\\nonMount(() => {\\r\\n    authService.deleteToken();\\r\\n});\\r\\n\\r\\n\\r\\nfunction isValidInputs() {\\r\\n    return (name.length >= 2 && name.length <= 32) &&\\r\\n        (surname.length >= 2 && surname.length <= 32) &&\\r\\n        (email.length >= 6 && email.length <= 64) &&\\r\\n        authService.emailRegex.test(email) &&\\r\\n        (password1.length >= 6 && password1.length <= 64) &&\\r\\n        password1 === password2;\\r\\n}\\r\\n\\r\\nfunction onKeyup(event) {\\r\\n    if(event.keyCode === 13){\\r\\n        onSubmit();\\r\\n    }\\r\\n}\\r\\n\\r\\nasync function onSubmit() {\\r\\n    submitClicked = true;\\r\\n    if(isValidInputs()) {\\r\\n        let res = await authService.register(name, surname, email, password1);\\r\\n        if(!res.error) {\\r\\n            authService.setToken(res.token);\\r\\n            navigate('/');\\r\\n        } else {\\r\\n            registerError = true;\\r\\n        }\\r\\n    }\\r\\n}\\r\\n</script>\\r\\n\\r\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}\\nform .text-danger {\\n  font-size: 13px;\\n  font-style: italic;\\n}</style>\\r\\n\\r\\n<div class=\\\"wrapper\\\">\\r\\n    <form>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputEmail1\\\">Name</label>\\r\\n            <input bind:value={name} type=\\\"text\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputName\\\" placeholder=\\\"Enter name\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if name.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Name is required*</span> \\r\\n            {/if}\\r\\n            {#if name.length !== 0 && name.length < 2 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Name is too short*</span> \\r\\n            {/if}\\r\\n            {#if name.length > 32 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Name is too long*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputEmail1\\\">Surname</label>\\r\\n            <input bind:value={surname} type=\\\"text\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputSurname\\\" placeholder=\\\"Enter surname\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if surname.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Surname is required*</span> \\r\\n            {/if}\\r\\n            {#if surname.length !== 0 && surname.length < 2 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Surname is too short*</span> \\r\\n            {/if}\\r\\n            {#if surname.length > 32 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Surname is too long*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputEmail1\\\">Email address</label>\\r\\n            <input bind:value={email} type=\\\"email\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputEmail1\\\" aria-describedby=\\\"emailHelp\\\" placeholder=\\\"Enter email\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if email.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is required*</span> \\r\\n            {/if}\\r\\n            {#if email.length !== 0 && email.length < 6 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is too short*</span> \\r\\n            {/if}\\r\\n            {#if email.length > 64 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is too long*</span> \\r\\n            {/if}\\r\\n            {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Email is not valid*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputPassword1\\\">Password</label>\\r\\n            <input bind:value={password1} type=\\\"password\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputPassword1\\\" placeholder=\\\"Password\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if password1.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Password is required*</span> \\r\\n            {/if}\\r\\n            {#if password1.length !== 0 && password1.length < 6 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Password is too short*</span> \\r\\n            {/if}\\r\\n            {#if password1.length > 64 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Password is too long*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        <div class=\\\"form-group\\\">\\r\\n            <label for=\\\"exampleInputPassword1\\\">Confirm Password</label>\\r\\n            <input bind:value={password2} type=\\\"password\\\" class=\\\"form-control\\\" \\r\\n                id=\\\"exampleInputPassword2\\\" placeholder=\\\"Password\\\" on:keyup=\\\"{onKeyup}\\\">\\r\\n            {#if password2.length === 0 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Please confirm password*</span> \\r\\n            {/if}\\r\\n            {#if password2.length !== 0 && password1 !== password2 && submitClicked}\\r\\n                <span class=\\\"error text-danger\\\">Passwords do not match*</span> \\r\\n            {/if}\\r\\n        </div>\\r\\n        {#if registerError && isValidInputs()}\\r\\n                <span class=\\\"error text-danger\\\">Email already exists*</span> \\r\\n        {/if}\\r\\n        <div class=\\\"action\\\">\\r\\n            <Link class=\\\"already\\\" to=\\\"/login\\\">\\r\\n                Already Registered?\\r\\n            </Link>\\r\\n            <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click=\\\"{onSubmit}\\\">Register</button>\\r\\n        </div>\\r\\n    </form>\\r\\n</div>\"],\"names\":[],\"mappings\":\"AA6CmB,QAAQ,8BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,8BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,mBAAI,CAAC,OAAO,eAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC,AACD,mBAAI,CAAC,YAAY,eAAC,CAAC,AACjB,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,MAAM,AACpB,CAAC\"}"
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

/* src\routes\Profile.svelte generated by Svelte v3.24.0 */

const css$2 = {
	code: "div.svelte-v5ji3m.svelte-v5ji3m{color:red}div.svelte-v5ji3m span.svelte-v5ji3m{color:blue}",
	map: "{\"version\":3,\"file\":\"Profile.svelte\",\"sources\":[\"Profile.svelte\"],\"sourcesContent\":[\"<script lang=\\\"typescript\\\">let testTS = \\\"Hello TypeScript\\\";\\r\\nlet testSCSS = \\\"Hello SCSS\\\";\\r\\n</script>\\r\\n\\r\\n<style type=\\\"text/scss\\\">div {\\n  color: red;\\n}\\ndiv span {\\n  color: blue;\\n}</style>\\r\\n\\r\\n<div>\\r\\n    {testTS}\\r\\n    <span>{testSCSS}</span>\\r\\n</div>\\r\\n\\r\\n\"],\"names\":[],\"mappings\":\"AAIwB,GAAG,4BAAC,CAAC,AAC3B,KAAK,CAAE,GAAG,AACZ,CAAC,AACD,iBAAG,CAAC,IAAI,cAAC,CAAC,AACR,KAAK,CAAE,IAAI,AACb,CAAC\"}"
};

let testTS = "Hello TypeScript";
let testSCSS = "Hello SCSS";

const Profile = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	$$result.css.add(css$2);

	return `<div class="${"svelte-v5ji3m"}">${escape(testTS)}
    <span class="${"svelte-v5ji3m"}">${escape(testSCSS)}</span></div>`;
});

/* src\routes\Home.svelte generated by Svelte v3.24.0 */

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

/* src\routes\Gamiyole.svelte generated by Svelte v3.24.0 */

const css$3 = {
	code: ".wrapper.svelte-rnsfl4.svelte-rnsfl4{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-rnsfl4.svelte-rnsfl4{width:350px}form.svelte-rnsfl4 .action.svelte-rnsfl4{display:flex;justify-content:space-between;align-items:center}",
	map: "{\"version\":3,\"file\":\"Gamiyole.svelte\",\"sources\":[\"Gamiyole.svelte\"],\"sourcesContent\":[\"<script>\\r\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\r\\nimport { GoogleService } from \\\"../services/google.service\\\";\\r\\nimport { Link } from 'svelte-routing';\\r\\n\\r\\nconst googleService = GoogleService.getInstance();\\r\\n\\r\\nconst dateHours = new Date().getHours();\\r\\nconst dateMinutes = new Date().getMinutes();\\r\\nlet fromUni,\\r\\n  destination = \\\"\\\",\\r\\n  seats = 1,\\r\\n  startTime =\\r\\n    (dateHours < 10 ? \\\"0\\\" : \\\"\\\") +\\r\\n    dateHours +\\r\\n    \\\":\\\" +\\r\\n    (dateMinutes < 10 ? \\\"0\\\" : \\\"\\\") +\\r\\n    dateMinutes,\\r\\n  endTime =\\r\\n    (dateHours < 10 ? \\\"0\\\" : \\\"\\\") +\\r\\n    dateHours +\\r\\n    \\\":\\\" +\\r\\n    (dateMinutes < 10 ? \\\"0\\\" : \\\"\\\") +\\r\\n    dateMinutes;\\r\\nlet predictions = [];\\r\\nlet clicked = false;\\r\\n\\r\\n$: {\\r\\n  console.log(startTime, endTime);\\r\\n}\\r\\n\\r\\n$: {\\r\\n  console.log(seats);\\r\\n}\\r\\n\\r\\nif (DeviceDetectorService.isBrowser && window.navigator) {\\r\\n  isAtUni();\\r\\n}\\r\\n\\r\\nfunction isAtUni() {\\r\\n  let lat, lng;\\r\\n  navigator.geolocation.getCurrentPosition(pos => {\\r\\n    lat = pos.coords.latitude;\\r\\n    lng = pos.coords.longitude;\\r\\n\\r\\n    const distanceFromCenter = Math.sqrt(\\r\\n      Math.pow(lat - DeviceDetectorService.latUni, 2) +\\r\\n        Math.pow(lng - DeviceDetectorService.lngUni, 2)\\r\\n    );\\r\\n\\r\\n    if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {\\r\\n      fromUni = true;\\r\\n    } else {\\r\\n      fromUni = false;\\r\\n    }\\r\\n  });\\r\\n}\\r\\n\\r\\nfunction onSubmit() {\\r\\n  console.log(\\\"submit\\\");\\r\\n}\\r\\n\\r\\nfunction getAutoCompletedData() {\\r\\n  if (DeviceDetectorService.isBrowser) {\\r\\n    googleService.getSuggestedPlaces(destination).then(res => {\\r\\n      predictions = res;\\r\\n    });\\r\\n  }\\r\\n}\\r\\n</script>\\r\\n\\r\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}</style>\\r\\n\\r\\n<div class=\\\"wrapper\\\">\\r\\n  <form>\\r\\n    <div class=\\\"form-group\\\">\\r\\n      <label>{fromUni ? 'To' : 'From'}</label>\\r\\n      <input\\r\\n        bind:value={destination}\\r\\n        type=\\\"search\\\"\\r\\n        class=\\\"form-control\\\"\\r\\n        placeholder={fromUni ? 'To' : 'From'}\\r\\n        on:input={res => {\\r\\n          getAutoCompletedData();\\r\\n          clicked = false;\\r\\n        }} />\\r\\n    </div>\\r\\n    {#if destination !== '' && !clicked}\\r\\n      <div>\\r\\n        {#each predictions as prediction}\\r\\n          <input\\r\\n            type=\\\"text\\\"\\r\\n            class=\\\"form-control\\\"\\r\\n            value=\\\"{prediction}/\\\"\\r\\n            readonly\\r\\n            on:click={res => {\\r\\n              destination = prediction;\\r\\n              clicked = true;\\r\\n            }} />\\r\\n        {/each}\\r\\n      </div>\\r\\n    {/if}\\r\\n    <div>\\r\\n      {#if destination === ''}\\r\\n        <Link to=\\\"/map\\\">Pic on Map</Link>\\r\\n      {/if}\\r\\n    </div>\\r\\n    <div class=\\\"form-group\\\">\\r\\n      <label>From</label>\\r\\n      <input\\r\\n        bind:value={startTime}\\r\\n        type=\\\"time\\\"\\r\\n        class=\\\"form-control\\\"\\r\\n        placeholder=\\\"From\\\" />\\r\\n    </div>\\r\\n    <div class=\\\"form-group\\\">\\r\\n      <label>To</label>\\r\\n      <input\\r\\n        bind:value={endTime}\\r\\n        type=\\\"time\\\"\\r\\n        class=\\\"form-control\\\"\\r\\n        placeholder=\\\"To\\\" />\\r\\n    </div>\\r\\n    <div class=\\\"action\\\">\\r\\n      <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click={onSubmit}>\\r\\n        Gamiyole\\r\\n      </button>\\r\\n    </div>\\r\\n  </form>\\r\\n</div>\\r\\n\"],\"names\":[],\"mappings\":\"AAuEmB,QAAQ,4BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,kBAAI,CAAC,OAAO,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC\"}"
};

const Gamiyole = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const googleService = GoogleService.getInstance();
	const dateHours = new Date().getHours();
	const dateMinutes = new Date().getMinutes();

	let fromUni,
		destination = "",
		seats = 1,
		startTime = (dateHours < 10 ? "0" : "") + dateHours + ":" + (dateMinutes < 10 ? "0" : "") + dateMinutes,
		endTime = (dateHours < 10 ? "0" : "") + dateHours + ":" + (dateMinutes < 10 ? "0" : "") + dateMinutes;

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

	 {
		{
			console.log(seats);
		}
	}

	return `<div class="${"wrapper svelte-rnsfl4"}"><form class="${"svelte-rnsfl4"}"><div class="${"form-group"}"><label>${escape(fromUni ? "To" : "From")}</label>
      <input type="${"search"}" class="${"form-control"}"${add_attribute("placeholder", fromUni ? "To" : "From", 0)}${add_attribute("value", destination, 1)}></div>
    ${ ``}
    <div>${ `${validate_component(Link, "Link").$$render($$result, { to: "/map" }, {}, { default: () => `Pic on Map` })}`
	}</div>
    <div class="${"form-group"}"><label>From</label>
      <input type="${"time"}" class="${"form-control"}" placeholder="${"From"}"${add_attribute("value", startTime, 1)}></div>
    <div class="${"form-group"}"><label>To</label>
      <input type="${"time"}" class="${"form-control"}" placeholder="${"To"}"${add_attribute("value", endTime, 1)}></div>
    <div class="${"action svelte-rnsfl4"}"><button type="${"button"}" class="${"btn btn-primary"}">Gamiyole
      </button></div></form></div>`;
});

/* src\routes\Gagiyoleb.svelte generated by Svelte v3.24.0 */

const css$4 = {
	code: ".wrapper.svelte-rnsfl4.svelte-rnsfl4{width:100%;height:100%;display:flex;justify-content:center;align-items:center}form.svelte-rnsfl4.svelte-rnsfl4{width:350px}form.svelte-rnsfl4 .action.svelte-rnsfl4{display:flex;justify-content:space-between;align-items:center}",
	map: "{\"version\":3,\"file\":\"Gagiyoleb.svelte\",\"sources\":[\"Gagiyoleb.svelte\"],\"sourcesContent\":[\"<script>\\r\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\r\\nimport { GoogleService } from \\\"../services/google.service\\\";\\r\\nimport { Link } from 'svelte-routing';\\r\\n\\r\\nconst googleService = GoogleService.getInstance();\\r\\n\\r\\nconst dateHours = new Date().getHours();\\r\\nconst dateMinutes = new Date().getMinutes();\\r\\nlet fromUni,\\r\\n  destination = \\\"\\\",\\r\\n  seats = 1,\\r\\n  time =\\r\\n    (dateHours < 10 ? \\\"0\\\" : \\\"\\\") +\\r\\n    dateHours +\\r\\n    \\\":\\\" +\\r\\n    (dateMinutes < 10 ? \\\"0\\\" : \\\"\\\") +\\r\\n    dateMinutes;\\r\\nlet predictions = [];\\r\\nlet clicked = false;\\r\\n\\r\\n$: {\\r\\n  console.log(time);\\r\\n}\\r\\n\\r\\n$: {\\r\\n  console.log(seats);\\r\\n}\\r\\n\\r\\nif (DeviceDetectorService.isBrowser && window.navigator) {\\r\\n  isAtUni();\\r\\n}\\r\\n\\r\\nfunction isAtUni() {\\r\\n  let lat, lng;\\r\\n  navigator.geolocation.getCurrentPosition(pos => {\\r\\n    lat = pos.coords.latitude;\\r\\n    lng = pos.coords.longitude;\\r\\n\\r\\n    const distanceFromCenter = Math.sqrt(\\r\\n      Math.pow(lat - DeviceDetectorService.latUni, 2) +\\r\\n        Math.pow(lng - DeviceDetectorService.lngUni, 2)\\r\\n    );\\r\\n\\r\\n    if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {\\r\\n      fromUni = true;\\r\\n    } else {\\r\\n      fromUni = false;\\r\\n    }\\r\\n  });\\r\\n}\\r\\n\\r\\nfunction onSubmit() {\\r\\n  console.log(\\\"submit\\\");\\r\\n}\\r\\n\\r\\nfunction getAutoCompletedData() {\\r\\n  if (DeviceDetectorService.isBrowser) {\\r\\n    googleService.getSuggestedPlaces(destination).then(res => {\\r\\n      predictions = res;\\r\\n    });\\r\\n  }\\r\\n}\\r\\n</script>\\r\\n\\r\\n<style type=\\\"scss\\\">.wrapper {\\n  width: 100%;\\n  height: 100%;\\n  display: flex;\\n  justify-content: center;\\n  align-items: center;\\n}\\n\\nform {\\n  width: 350px;\\n}\\nform .action {\\n  display: flex;\\n  justify-content: space-between;\\n  align-items: center;\\n}</style>\\r\\n\\r\\n<div class=\\\"wrapper\\\">\\r\\n  <form>\\r\\n    <div class=\\\"form-group\\\">\\r\\n      <label>{fromUni ? 'To' : 'From'}</label>\\r\\n      <input\\r\\n        bind:value={destination}\\r\\n        type=\\\"search\\\"\\r\\n        class=\\\"form-control\\\"\\r\\n        placeholder={fromUni ? 'To' : 'From'}\\r\\n        on:input={res => {\\r\\n          getAutoCompletedData();\\r\\n          clicked = false;\\r\\n        }} />\\r\\n    </div>\\r\\n    {#if destination !== '' && !clicked}\\r\\n      <div>\\r\\n        {#each predictions as prediction}\\r\\n          <input\\r\\n            type=\\\"text\\\"\\r\\n            class=\\\"form-control\\\"\\r\\n            value=\\\"{prediction}/\\\"\\r\\n            readonly\\r\\n            on:click={res => {\\r\\n              destination = prediction;\\r\\n              clicked = true;\\r\\n            }} />\\r\\n        {/each}\\r\\n      </div>\\r\\n    {/if}\\r\\n    <div>\\r\\n      {#if destination === ''}\\r\\n        <Link to=\\\"/map\\\">Pic on Map</Link>\\r\\n      {/if}\\r\\n    </div>\\r\\n    <div class=\\\"form-group\\\">\\r\\n      <label>Time</label>\\r\\n      <input\\r\\n        bind:value={time}\\r\\n        type=\\\"time\\\"\\r\\n        class=\\\"form-control\\\"\\r\\n        placeholder=\\\"Time\\\" />\\r\\n    </div>\\r\\n    <div class=\\\"form-group\\\">\\r\\n      <label>Number of Seats</label>\\r\\n      <input\\r\\n        bind:value={seats}\\r\\n        type=\\\"number\\\"\\r\\n        class=\\\"form-control\\\"\\r\\n        placeholder=\\\"Number of Seats\\\" />\\r\\n    </div>\\r\\n    <div class=\\\"action\\\">\\r\\n      <button type=\\\"button\\\" class=\\\"btn btn-primary\\\" on:click={onSubmit}>\\r\\n        Gagiyoleb\\r\\n      </button>\\r\\n    </div>\\r\\n  </form>\\r\\n</div>\\r\\n\"],\"names\":[],\"mappings\":\"AAiEmB,QAAQ,4BAAC,CAAC,AAC3B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,MAAM,CACvB,WAAW,CAAE,MAAM,AACrB,CAAC,AAED,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,KAAK,AACd,CAAC,AACD,kBAAI,CAAC,OAAO,cAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC\"}"
};

const Gagiyoleb = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const googleService = GoogleService.getInstance();
	const dateHours = new Date().getHours();
	const dateMinutes = new Date().getMinutes();

	let fromUni,
		destination = "",
		seats = 1,
		time = (dateHours < 10 ? "0" : "") + dateHours + ":" + (dateMinutes < 10 ? "0" : "") + dateMinutes;

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
			console.log(seats);
		}
	}

	return `<div class="${"wrapper svelte-rnsfl4"}"><form class="${"svelte-rnsfl4"}"><div class="${"form-group"}"><label>${escape(fromUni ? "To" : "From")}</label>
      <input type="${"search"}" class="${"form-control"}"${add_attribute("placeholder", fromUni ? "To" : "From", 0)}${add_attribute("value", destination, 1)}></div>
    ${ ``}
    <div>${ `${validate_component(Link, "Link").$$render($$result, { to: "/map" }, {}, { default: () => `Pic on Map` })}`
	}</div>
    <div class="${"form-group"}"><label>Time</label>
      <input type="${"time"}" class="${"form-control"}" placeholder="${"Time"}"${add_attribute("value", time, 1)}></div>
    <div class="${"form-group"}"><label>Number of Seats</label>
      <input type="${"number"}" class="${"form-control"}" placeholder="${"Number of Seats"}"${add_attribute("value", seats, 1)}></div>
    <div class="${"action svelte-rnsfl4"}"><button type="${"button"}" class="${"btn btn-primary"}">Gagiyoleb
      </button></div></form></div>`;
});

/* src\components\Map.svelte generated by Svelte v3.24.0 */

const css$5 = {
	code: ".full-screen.svelte-17pn0o7{width:100vw;height:90vh}",
	map: "{\"version\":3,\"file\":\"Map.svelte\",\"sources\":[\"Map.svelte\"],\"sourcesContent\":[\"<script>\\r\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\r\\nimport { Link } from \\\"svelte-routing\\\";\\r\\n\\r\\nlet container;\\r\\nlet map;\\r\\nlet zoom = 16;\\r\\nlet center = { lat: DeviceDetectorService.latUni, lng: DeviceDetectorService.lngUni };\\r\\nlet directionsService;\\r\\nlet directionsRenderer;\\r\\nlet count = 0;\\r\\nlet startLocation;\\r\\nlet endLocation;\\r\\nlet marker;\\r\\n\\r\\nimport { onMount } from \\\"svelte\\\";\\r\\n\\r\\nonMount(async () => {\\r\\n  directionsService = new google.maps.DirectionsService();\\r\\n  directionsRenderer = new google.maps.DirectionsRenderer();\\r\\n  map = new google.maps.Map(container, {\\r\\n    zoom,\\r\\n    center\\r\\n  });\\r\\n  marker = new google.maps.Marker({\\r\\n      map: map,\\r\\n      position: center,\\r\\n      draggable: true\\r\\n  });\\r\\n  map.addListener(\\\"click\\\", function(mapsMouseEvent) {\\r\\n      marker.setPosition(mapsMouseEvent.latLng)\\r\\n  });\\r\\n  directionsRenderer.setMap(map);\\r\\n});\\r\\n</script>\\r\\n\\r\\n<style>\\r\\n.full-screen {\\r\\n  width: 100vw;\\r\\n  height: 90vh;\\r\\n}\\r\\n</style>\\r\\n\\r\\n<Link to='/'>Go back</Link>\\r\\n<div class=\\\"full-screen\\\" bind:this={container} />\\r\\n<button on:click={()=>{\\r\\n    console.log(marker.getPosition().lat(), marker.getPosition().lng())\\r\\n}}>Submit</button>\\r\\n\"],\"names\":[],\"mappings\":\"AAqCA,YAAY,eAAC,CAAC,AACZ,KAAK,CAAE,KAAK,CACZ,MAAM,CAAE,IAAI,AACd,CAAC\"}"
};

let zoom = 16;

const Map$1 = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let container;
	let map;

	let center = {
		lat: DeviceDetectorService.latUni,
		lng: DeviceDetectorService.lngUni
	};

	let directionsService;
	let directionsRenderer;
	let marker;

	onMount(async () => {
		directionsService = new google.maps.DirectionsService();
		directionsRenderer = new google.maps.DirectionsRenderer();
		map = new google.maps.Map(container, { zoom, center });
		marker = new google.maps.Marker({ map, position: center, draggable: true });

		map.addListener("click", function (mapsMouseEvent) {
			marker.setPosition(mapsMouseEvent.latLng);
		});

		directionsRenderer.setMap(map);
	});

	$$result.css.add(css$5);

	return `${validate_component(Link, "Link").$$render($$result, { to: "/" }, {}, { default: () => `Go back` })}
<div class="${"full-screen svelte-17pn0o7"}"${add_attribute("this", container, 1)}></div>
<button>Submit</button>`;
});

/* src\routes\MapApp.svelte generated by Svelte v3.24.0 */

const css$6 = {
	code: "body{padding:0}",
	map: "{\"version\":3,\"file\":\"MapApp.svelte\",\"sources\":[\"MapApp.svelte\"],\"sourcesContent\":[\"<script>\\r\\nimport { DeviceDetectorService } from \\\"../services/deviceDetectorService.service\\\";\\r\\nimport Map from \\\"../components/Map.svelte\\\";\\r\\nimport { GoogleService } from \\\"../services/google.service\\\";\\r\\n\\r\\n\\r\\nconst googleService = GoogleService.getInstance()\\r\\n\\r\\n</script>\\r\\n\\r\\n<style>\\r\\n:global(body) {\\r\\n  padding: 0;\\r\\n}\\r\\n</style>\\r\\n\\r\\n{#if googleService.mapLoaded}\\r\\n  <Map />\\r\\n{/if}\\r\\n\"],\"names\":[],\"mappings\":\"AAWQ,IAAI,AAAE,CAAC,AACb,OAAO,CAAE,CAAC,AACZ,CAAC\"}"
};

const MapApp = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	const googleService = GoogleService.getInstance();
	$$result.css.add(css$6);

	return `${googleService.mapLoaded
	? `${validate_component(Map$1, "Map").$$render($$result, {}, {}, {})}`
	: ``}`;
});

/* src\App.svelte generated by Svelte v3.24.0 */

const App = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	if (DeviceDetectorService.isBrowser) {
		window.initMap = function () {
			GoogleService.getInstance().setMapLoaded(true);
		};
	}

	let { url = "" } = $$props;
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);

	return `${validate_component(Router, "Router").$$render($$result, { url }, {}, {
		default: () => `${validate_component(Route, "Route").$$render($$result, { path: "login", component: Login }, {}, {})}
	  ${validate_component(Route, "Route").$$render($$result, { path: "register", component: Register }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "profile", component: Profile }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "/", component: Home }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "gamiyole", component: Gamiyole }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "gagiyoleb", component: Gagiyoleb }, {}, {})}
    ${validate_component(Route, "Route").$$render($$result, { path: "map", component: MapApp }, {}, {})}`
	})}`;
});

module.exports = App;
