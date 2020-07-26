
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                const remove = [];
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j++];
                    if (!attributes[attribute.name]) {
                        remove.push(attribute.name);
                    }
                }
                for (let k = 0; k < remove.length; k++) {
                    node.removeAttribute(remove[k]);
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
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

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.24.0 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(10, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(9, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(8, $base = value));

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

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$base,
    		$location,
    		$routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 256) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 1536) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [routes, location, base, basepath, url, $$scope, $$slots];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.24.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 2,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[1],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, routeParams, $location*/ 530) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[1],
    		/*routeProps*/ ctx[2]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 22)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 2 && get_spread_object(/*routeParams*/ ctx[1]),
    					dirty & /*routeProps*/ 4 && get_spread_object(/*routeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

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

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Route", $$slots, ['default']);

    	$$self.$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(1, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(2, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(1, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(2, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Link.svelte generated by Svelte v3.24.0 */
    const file = "node_modules\\svelte-routing\\src\\Link.svelte";

    function create_fragment$2(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{ "aria-current": /*ariaCurrent*/ ctx[2] },
    		/*props*/ ctx[1]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			a = claim_element(nodes, "A", { href: true, "aria-current": true });
    			var a_nodes = children(a);
    			if (default_slot) default_slot.l(a_nodes);
    			a_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			set_attributes(a, a_data);
    			add_location(a, file, 40, 0, 1185);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*onClick*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
    				(!current || dirty & /*ariaCurrent*/ 4) && { "aria-current": /*ariaCurrent*/ ctx[2] },
    				dirty & /*props*/ 2 && /*props*/ ctx[1]
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let { to = "#" } = $$props;
    	let { replace = false } = $$props;
    	let { state = {} } = $$props;
    	let { getProps = () => ({}) } = $$props;
    	const { base } = getContext(ROUTER);
    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(14, $base = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(15, $location = value));
    	const dispatch = createEventDispatcher();
    	let href, isPartiallyCurrent, isCurrent, props;

    	function onClick(event) {
    		dispatch("click", event);

    		if (shouldNavigate(event)) {
    			event.preventDefault();

    			// Don't push another entry to the history stack when the user
    			// clicks on a Link to the page they are currently on.
    			const shouldReplace = $location.pathname === href || replace;

    			navigate(href, { state, replace: shouldReplace });
    		}
    	}

    	const writable_props = ["to", "replace", "state", "getProps"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Link", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("to" in $$props) $$invalidate(6, to = $$props.to);
    		if ("replace" in $$props) $$invalidate(7, replace = $$props.replace);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("getProps" in $$props) $$invalidate(9, getProps = $$props.getProps);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		createEventDispatcher,
    		ROUTER,
    		LOCATION,
    		navigate,
    		startsWith,
    		resolve,
    		shouldNavigate,
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		dispatch,
    		href,
    		isPartiallyCurrent,
    		isCurrent,
    		props,
    		onClick,
    		$base,
    		$location,
    		ariaCurrent
    	});

    	$$self.$inject_state = $$props => {
    		if ("to" in $$props) $$invalidate(6, to = $$props.to);
    		if ("replace" in $$props) $$invalidate(7, replace = $$props.replace);
    		if ("state" in $$props) $$invalidate(8, state = $$props.state);
    		if ("getProps" in $$props) $$invalidate(9, getProps = $$props.getProps);
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("isPartiallyCurrent" in $$props) $$invalidate(12, isPartiallyCurrent = $$props.isPartiallyCurrent);
    		if ("isCurrent" in $$props) $$invalidate(13, isCurrent = $$props.isCurrent);
    		if ("props" in $$props) $$invalidate(1, props = $$props.props);
    		if ("ariaCurrent" in $$props) $$invalidate(2, ariaCurrent = $$props.ariaCurrent);
    	};

    	let ariaCurrent;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $base*/ 16448) {
    			 $$invalidate(0, href = to === "/" ? $base.uri : resolve(to, $base.uri));
    		}

    		if ($$self.$$.dirty & /*$location, href*/ 32769) {
    			 $$invalidate(12, isPartiallyCurrent = startsWith($location.pathname, href));
    		}

    		if ($$self.$$.dirty & /*href, $location*/ 32769) {
    			 $$invalidate(13, isCurrent = href === $location.pathname);
    		}

    		if ($$self.$$.dirty & /*isCurrent*/ 8192) {
    			 $$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
    		}

    		if ($$self.$$.dirty & /*getProps, $location, href, isPartiallyCurrent, isCurrent*/ 45569) {
    			 $$invalidate(1, props = getProps({
    				location: $location,
    				href,
    				isPartiallyCurrent,
    				isCurrent
    			}));
    		}
    	};

    	return [
    		href,
    		props,
    		ariaCurrent,
    		base,
    		location,
    		onClick,
    		to,
    		replace,
    		state,
    		getProps,
    		$$scope,
    		$$slots
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { to: 6, replace: 7, state: 8, getProps: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var baseAPIUrl="http://localhost:8082";var googleAPIUrl="https://maps.googleapis.com/maps/api/";

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

    /* src\routes\Login.svelte generated by Svelte v3.24.0 */
    const file$1 = "src\\routes\\Login.svelte";

    // (70:12) {#if email.length === 0 && submitClicked}
    function create_if_block_7(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is required*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is required*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 70, 16, 2429);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(70:12) {#if email.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (73:12) {#if email.length !== 0 && email.length < 6 && submitClicked}
    function create_if_block_6(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is too short*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is too short*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 73, 16, 2599);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(73:12) {#if email.length !== 0 && email.length < 6 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (76:12) {#if email.length > 64 && submitClicked}
    function create_if_block_5(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is too long*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is too long*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 76, 16, 2749);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(76:12) {#if email.length > 64 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (79:12) {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}
    function create_if_block_4(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is not valid*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is not valid*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 79, 16, 2959);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(79:12) {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (87:12) {#if password.length === 0 && submitClicked}
    function create_if_block_3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Password is required*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Password is required*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 87, 16, 3397);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(87:12) {#if password.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (90:12) {#if password.length !== 0 && password.length < 6 && submitClicked}
    function create_if_block_2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Password is too short*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Password is too short*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 90, 16, 3576);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(90:12) {#if password.length !== 0 && password.length < 6 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (93:12) {#if password.length > 64 && submitClicked}
    function create_if_block_1$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Password is too long*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Password is too long*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 93, 16, 3732);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(93:12) {#if password.length > 64 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (97:8) {#if loginError && isValidInputs()}
    function create_if_block$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email or Password is wrong*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email or Password is wrong*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger");
    			add_location(span, file$1, 97, 16, 3891);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(97:8) {#if loginError && isValidInputs()}",
    		ctx
    	});

    	return block;
    }

    // (101:12) <Link class="already" to="/register">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Not Registered Yet?");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "Not Registered Yet?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(101:12) <Link class=\\\"already\\\" to=\\\"/register\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div3;
    	let form;
    	let div0;
    	let label0;
    	let t0;
    	let t1;
    	let input0;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let show_if_1 = /*email*/ ctx[2].length >= 6 && /*email*/ ctx[2].length <= 64 && !/*authService*/ ctx[4].emailRegex.test(/*email*/ ctx[2]) && /*submitClicked*/ ctx[0];
    	let t6;
    	let div1;
    	let label1;
    	let t7;
    	let t8;
    	let input1;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let show_if = /*loginError*/ ctx[1] && /*isValidInputs*/ ctx[5]();
    	let t13;
    	let div2;
    	let link;
    	let t14;
    	let button;
    	let t15;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*email*/ ctx[2].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_7(ctx);
    	let if_block1 = /*email*/ ctx[2].length !== 0 && /*email*/ ctx[2].length < 6 && /*submitClicked*/ ctx[0] && create_if_block_6(ctx);
    	let if_block2 = /*email*/ ctx[2].length > 64 && /*submitClicked*/ ctx[0] && create_if_block_5(ctx);
    	let if_block3 = show_if_1 && create_if_block_4(ctx);
    	let if_block4 = /*password*/ ctx[3].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_3(ctx);
    	let if_block5 = /*password*/ ctx[3].length !== 0 && /*password*/ ctx[3].length < 6 && /*submitClicked*/ ctx[0] && create_if_block_2(ctx);
    	let if_block6 = /*password*/ ctx[3].length > 64 && /*submitClicked*/ ctx[0] && create_if_block_1$1(ctx);
    	let if_block7 = show_if && create_if_block$1(ctx);

    	link = new Link({
    			props: {
    				class: "already",
    				to: "/register",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			t0 = text("Email address");
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			if (if_block3) if_block3.c();
    			t6 = space();
    			div1 = element("div");
    			label1 = element("label");
    			t7 = text("Password");
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			if (if_block4) if_block4.c();
    			t10 = space();
    			if (if_block5) if_block5.c();
    			t11 = space();
    			if (if_block6) if_block6.c();
    			t12 = space();
    			if (if_block7) if_block7.c();
    			t13 = space();
    			div2 = element("div");
    			create_component(link.$$.fragment);
    			t14 = space();
    			button = element("button");
    			t15 = text("Login");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div3 = claim_element(nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			form = claim_element(div3_nodes, "FORM", { class: true });
    			var form_nodes = children(form);
    			div0 = claim_element(form_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			label0 = claim_element(div0_nodes, "LABEL", { for: true });
    			var label0_nodes = children(label0);
    			t0 = claim_text(label0_nodes, "Email address");
    			label0_nodes.forEach(detach_dev);
    			t1 = claim_space(div0_nodes);

    			input0 = claim_element(div0_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				"aria-describedby": true,
    				placeholder: true
    			});

    			t2 = claim_space(div0_nodes);
    			if (if_block0) if_block0.l(div0_nodes);
    			t3 = claim_space(div0_nodes);
    			if (if_block1) if_block1.l(div0_nodes);
    			t4 = claim_space(div0_nodes);
    			if (if_block2) if_block2.l(div0_nodes);
    			t5 = claim_space(div0_nodes);
    			if (if_block3) if_block3.l(div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			t6 = claim_space(form_nodes);
    			div1 = claim_element(form_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			label1 = claim_element(div1_nodes, "LABEL", { for: true });
    			var label1_nodes = children(label1);
    			t7 = claim_text(label1_nodes, "Password");
    			label1_nodes.forEach(detach_dev);
    			t8 = claim_space(div1_nodes);

    			input1 = claim_element(div1_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				placeholder: true
    			});

    			t9 = claim_space(div1_nodes);
    			if (if_block4) if_block4.l(div1_nodes);
    			t10 = claim_space(div1_nodes);
    			if (if_block5) if_block5.l(div1_nodes);
    			t11 = claim_space(div1_nodes);
    			if (if_block6) if_block6.l(div1_nodes);
    			div1_nodes.forEach(detach_dev);
    			t12 = claim_space(form_nodes);
    			if (if_block7) if_block7.l(form_nodes);
    			t13 = claim_space(form_nodes);
    			div2 = claim_element(form_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			claim_component(link.$$.fragment, div2_nodes);
    			t14 = claim_space(div2_nodes);
    			button = claim_element(div2_nodes, "BUTTON", { type: true, class: true });
    			var button_nodes = children(button);
    			t15 = claim_text(button_nodes, "Login");
    			button_nodes.forEach(detach_dev);
    			div2_nodes.forEach(detach_dev);
    			form_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label0, "for", "exampleInputEmail1");
    			add_location(label0, file$1, 66, 12, 2111);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "exampleInputEmail1");
    			attr_dev(input0, "aria-describedby", "emailHelp");
    			attr_dev(input0, "placeholder", "Enter email");
    			add_location(input0, file$1, 67, 12, 2178);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$1, 65, 8, 2073);
    			attr_dev(label1, "for", "exampleInputPassword1");
    			add_location(label1, file$1, 83, 12, 3101);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "exampleInputPassword1");
    			attr_dev(input1, "placeholder", "Password");
    			add_location(input1, file$1, 84, 12, 3166);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$1, 82, 8, 3063);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file$1, 103, 12, 4126);
    			attr_dev(div2, "class", "action svelte-rnsfl4");
    			add_location(div2, file$1, 99, 8, 3983);
    			attr_dev(form, "class", "svelte-rnsfl4");
    			add_location(form, file$1, 64, 4, 2057);
    			attr_dev(div3, "class", "wrapper svelte-rnsfl4");
    			add_location(div3, file$1, 63, 0, 2030);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, form);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*email*/ ctx[2]);
    			append_dev(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t3);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t4);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div0, t5);
    			if (if_block3) if_block3.m(div0, null);
    			append_dev(form, t6);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[3]);
    			append_dev(div1, t9);
    			if (if_block4) if_block4.m(div1, null);
    			append_dev(div1, t10);
    			if (if_block5) if_block5.m(div1, null);
    			append_dev(div1, t11);
    			if (if_block6) if_block6.m(div1, null);
    			append_dev(form, t12);
    			if (if_block7) if_block7.m(form, null);
    			append_dev(form, t13);
    			append_dev(form, div2);
    			mount_component(link, div2, null);
    			append_dev(div2, t14);
    			append_dev(div2, button);
    			append_dev(button, t15);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input0, "keyup", /*onKeyup*/ ctx[6], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(input1, "keyup", /*onKeyup*/ ctx[6], false, false, false),
    					listen_dev(button, "click", /*onSubmit*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 4 && input0.value !== /*email*/ ctx[2]) {
    				set_input_value(input0, /*email*/ ctx[2]);
    			}

    			if (/*email*/ ctx[2].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(div0, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*email*/ ctx[2].length !== 0 && /*email*/ ctx[2].length < 6 && /*submitClicked*/ ctx[0]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_6(ctx);
    					if_block1.c();
    					if_block1.m(div0, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*email*/ ctx[2].length > 64 && /*submitClicked*/ ctx[0]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_5(ctx);
    					if_block2.c();
    					if_block2.m(div0, t5);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*email, submitClicked*/ 5) show_if_1 = /*email*/ ctx[2].length >= 6 && /*email*/ ctx[2].length <= 64 && !/*authService*/ ctx[4].emailRegex.test(/*email*/ ctx[2]) && /*submitClicked*/ ctx[0];

    			if (show_if_1) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_4(ctx);
    					if_block3.c();
    					if_block3.m(div0, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*password*/ 8 && input1.value !== /*password*/ ctx[3]) {
    				set_input_value(input1, /*password*/ ctx[3]);
    			}

    			if (/*password*/ ctx[3].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block4) ; else {
    					if_block4 = create_if_block_3(ctx);
    					if_block4.c();
    					if_block4.m(div1, t10);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*password*/ ctx[3].length !== 0 && /*password*/ ctx[3].length < 6 && /*submitClicked*/ ctx[0]) {
    				if (if_block5) ; else {
    					if_block5 = create_if_block_2(ctx);
    					if_block5.c();
    					if_block5.m(div1, t11);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*password*/ ctx[3].length > 64 && /*submitClicked*/ ctx[0]) {
    				if (if_block6) ; else {
    					if_block6 = create_if_block_1$1(ctx);
    					if_block6.c();
    					if_block6.m(div1, null);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (dirty & /*loginError*/ 2) show_if = /*loginError*/ ctx[1] && /*isValidInputs*/ ctx[5]();

    			if (show_if) {
    				if (if_block7) ; else {
    					if_block7 = create_if_block$1(ctx);
    					if_block7.c();
    					if_block7.m(form, t13);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			const link_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				link_changes.$$scope = { dirty, ctx };
    			}

    			link.$set(link_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			destroy_component(link);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
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
    	let loginError = false;
    	let email = "", password = "";
    	const authService = AuthService.getInstance();

    	onMount(() => {
    		authService.deleteToken();
    	});

    	function isValidInputs() {
    		return email.length >= 6 && email.length <= 64 && (password.length >= 6 && password.length <= 64) && authService.emailRegex.test(email);
    	}

    	function onKeyup(event) {
    		if (event.keyCode === 13) {
    			onSubmit();
    		}
    	}

    	function onSubmit() {
    		return __awaiter(this, void 0, void 0, function* () {
    			$$invalidate(0, submitClicked = true);

    			if (isValidInputs) {
    				let res = yield authService.login(email, password);

    				if (!res.error) {
    					authService.setToken(res.token);
    					navigate("/");
    				} else {
    					$$invalidate(1, loginError = true);
    				}
    			}
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Login", $$slots, []);

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(2, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(3, password);
    	}

    	$$self.$capture_state = () => ({
    		__awaiter,
    		onMount,
    		Link,
    		navigate,
    		AuthService,
    		submitClicked,
    		loginError,
    		email,
    		password,
    		authService,
    		isValidInputs,
    		onKeyup,
    		onSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("submitClicked" in $$props) $$invalidate(0, submitClicked = $$props.submitClicked);
    		if ("loginError" in $$props) $$invalidate(1, loginError = $$props.loginError);
    		if ("email" in $$props) $$invalidate(2, email = $$props.email);
    		if ("password" in $$props) $$invalidate(3, password = $$props.password);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		submitClicked,
    		loginError,
    		email,
    		password,
    		authService,
    		isValidInputs,
    		onKeyup,
    		onSubmit,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\routes\Register.svelte generated by Svelte v3.24.0 */
    const file$2 = "src\\routes\\Register.svelte";

    // (73:12) {#if name.length === 0 && submitClicked}
    function create_if_block_15(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Name is required*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Name is required*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 73, 16, 1854);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(73:12) {#if name.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (76:12) {#if name.length !== 0 && name.length < 2 && submitClicked}
    function create_if_block_14(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Name is too short*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Name is too short*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 76, 16, 2021);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(76:12) {#if name.length !== 0 && name.length < 2 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (79:12) {#if name.length > 32 && submitClicked}
    function create_if_block_13(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Name is too long*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Name is too long*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 79, 16, 2169);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(79:12) {#if name.length > 32 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (87:12) {#if surname.length === 0 && submitClicked}
    function create_if_block_12(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Surname is required*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Surname is required*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 87, 16, 2598);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(87:12) {#if surname.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (90:12) {#if surname.length !== 0 && surname.length < 2 && submitClicked}
    function create_if_block_11(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Surname is too short*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Surname is too short*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 90, 16, 2774);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(90:12) {#if surname.length !== 0 && surname.length < 2 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (93:12) {#if surname.length > 32 && submitClicked}
    function create_if_block_10(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Surname is too long*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Surname is too long*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 93, 16, 2928);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(93:12) {#if surname.length > 32 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (101:12) {#if email.length === 0 && submitClicked}
    function create_if_block_9(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is required*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is required*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 101, 16, 3389);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(101:12) {#if email.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (104:12) {#if email.length !== 0 && email.length < 6 && submitClicked}
    function create_if_block_8(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is too short*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is too short*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 104, 16, 3559);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(104:12) {#if email.length !== 0 && email.length < 6 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (107:12) {#if email.length > 64 && submitClicked}
    function create_if_block_7$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is too long*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is too long*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 107, 16, 3709);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$1.name,
    		type: "if",
    		source: "(107:12) {#if email.length > 64 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (110:12) {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}
    function create_if_block_6$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email is not valid*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email is not valid*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 110, 16, 3919);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(110:12) {#if email.length >= 6 && email.length <= 64 && !authService.emailRegex.test(email) && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (118:12) {#if password1.length === 0 && submitClicked}
    function create_if_block_5$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Password is required*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Password is required*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 118, 16, 4359);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(118:12) {#if password1.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (121:12) {#if password1.length !== 0 && password1.length < 6 && submitClicked}
    function create_if_block_4$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Password is too short*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Password is too short*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 121, 16, 4540);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(121:12) {#if password1.length !== 0 && password1.length < 6 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (124:12) {#if password1.length > 64 && submitClicked}
    function create_if_block_3$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Password is too long*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Password is too long*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 124, 16, 4697);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(124:12) {#if password1.length > 64 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (132:12) {#if password2.length === 0 && submitClicked}
    function create_if_block_2$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Please confirm password*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Please confirm password*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 132, 16, 5147);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(132:12) {#if password2.length === 0 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (135:12) {#if password2.length !== 0 && password1 !== password2 && submitClicked}
    function create_if_block_1$2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Passwords do not match*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Passwords do not match*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 135, 16, 5334);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(135:12) {#if password2.length !== 0 && password1 !== password2 && submitClicked}",
    		ctx
    	});

    	return block;
    }

    // (139:8) {#if registerError && isValidInputs()}
    function create_if_block$2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("Email already exists*");
    			this.h();
    		},
    		l: function claim(nodes) {
    			span = claim_element(nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t = claim_text(span_nodes, "Email already exists*");
    			span_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "error text-danger svelte-1cmpm85");
    			add_location(span, file$2, 139, 16, 5498);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(139:8) {#if registerError && isValidInputs()}",
    		ctx
    	});

    	return block;
    }

    // (143:12) <Link class="already" to="/login">
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Already Registered?");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "Already Registered?");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(143:12) <Link class=\\\"already\\\" to=\\\"/login\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div6;
    	let form;
    	let div0;
    	let label0;
    	let t0;
    	let t1;
    	let input0;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let label1;
    	let t6;
    	let t7;
    	let input1;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let div2;
    	let label2;
    	let t12;
    	let t13;
    	let input2;
    	let t14;
    	let t15;
    	let t16;
    	let t17;
    	let show_if_1 = /*email*/ ctx[4].length >= 6 && /*email*/ ctx[4].length <= 64 && !/*authService*/ ctx[7].emailRegex.test(/*email*/ ctx[4]) && /*submitClicked*/ ctx[0];
    	let t18;
    	let div3;
    	let label3;
    	let t19;
    	let t20;
    	let input3;
    	let t21;
    	let t22;
    	let t23;
    	let t24;
    	let div4;
    	let label4;
    	let t25;
    	let t26;
    	let input4;
    	let t27;
    	let t28;
    	let t29;
    	let show_if = /*registerError*/ ctx[1] && /*isValidInputs*/ ctx[8]();
    	let t30;
    	let div5;
    	let link;
    	let t31;
    	let button;
    	let t32;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*name*/ ctx[2].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_15(ctx);
    	let if_block1 = /*name*/ ctx[2].length !== 0 && /*name*/ ctx[2].length < 2 && /*submitClicked*/ ctx[0] && create_if_block_14(ctx);
    	let if_block2 = /*name*/ ctx[2].length > 32 && /*submitClicked*/ ctx[0] && create_if_block_13(ctx);
    	let if_block3 = /*surname*/ ctx[3].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_12(ctx);
    	let if_block4 = /*surname*/ ctx[3].length !== 0 && /*surname*/ ctx[3].length < 2 && /*submitClicked*/ ctx[0] && create_if_block_11(ctx);
    	let if_block5 = /*surname*/ ctx[3].length > 32 && /*submitClicked*/ ctx[0] && create_if_block_10(ctx);
    	let if_block6 = /*email*/ ctx[4].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_9(ctx);
    	let if_block7 = /*email*/ ctx[4].length !== 0 && /*email*/ ctx[4].length < 6 && /*submitClicked*/ ctx[0] && create_if_block_8(ctx);
    	let if_block8 = /*email*/ ctx[4].length > 64 && /*submitClicked*/ ctx[0] && create_if_block_7$1(ctx);
    	let if_block9 = show_if_1 && create_if_block_6$1(ctx);
    	let if_block10 = /*password1*/ ctx[5].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_5$1(ctx);
    	let if_block11 = /*password1*/ ctx[5].length !== 0 && /*password1*/ ctx[5].length < 6 && /*submitClicked*/ ctx[0] && create_if_block_4$1(ctx);
    	let if_block12 = /*password1*/ ctx[5].length > 64 && /*submitClicked*/ ctx[0] && create_if_block_3$1(ctx);
    	let if_block13 = /*password2*/ ctx[6].length === 0 && /*submitClicked*/ ctx[0] && create_if_block_2$1(ctx);
    	let if_block14 = /*password2*/ ctx[6].length !== 0 && /*password1*/ ctx[5] !== /*password2*/ ctx[6] && /*submitClicked*/ ctx[0] && create_if_block_1$2(ctx);
    	let if_block15 = show_if && create_if_block$2(ctx);

    	link = new Link({
    			props: {
    				class: "already",
    				to: "/login",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			t0 = text("Name");
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			div1 = element("div");
    			label1 = element("label");
    			t6 = text("Surname");
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			if (if_block3) if_block3.c();
    			t9 = space();
    			if (if_block4) if_block4.c();
    			t10 = space();
    			if (if_block5) if_block5.c();
    			t11 = space();
    			div2 = element("div");
    			label2 = element("label");
    			t12 = text("Email address");
    			t13 = space();
    			input2 = element("input");
    			t14 = space();
    			if (if_block6) if_block6.c();
    			t15 = space();
    			if (if_block7) if_block7.c();
    			t16 = space();
    			if (if_block8) if_block8.c();
    			t17 = space();
    			if (if_block9) if_block9.c();
    			t18 = space();
    			div3 = element("div");
    			label3 = element("label");
    			t19 = text("Password");
    			t20 = space();
    			input3 = element("input");
    			t21 = space();
    			if (if_block10) if_block10.c();
    			t22 = space();
    			if (if_block11) if_block11.c();
    			t23 = space();
    			if (if_block12) if_block12.c();
    			t24 = space();
    			div4 = element("div");
    			label4 = element("label");
    			t25 = text("Confirm Password");
    			t26 = space();
    			input4 = element("input");
    			t27 = space();
    			if (if_block13) if_block13.c();
    			t28 = space();
    			if (if_block14) if_block14.c();
    			t29 = space();
    			if (if_block15) if_block15.c();
    			t30 = space();
    			div5 = element("div");
    			create_component(link.$$.fragment);
    			t31 = space();
    			button = element("button");
    			t32 = text("Register");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div6 = claim_element(nodes, "DIV", { class: true });
    			var div6_nodes = children(div6);
    			form = claim_element(div6_nodes, "FORM", { class: true });
    			var form_nodes = children(form);
    			div0 = claim_element(form_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			label0 = claim_element(div0_nodes, "LABEL", { for: true });
    			var label0_nodes = children(label0);
    			t0 = claim_text(label0_nodes, "Name");
    			label0_nodes.forEach(detach_dev);
    			t1 = claim_space(div0_nodes);

    			input0 = claim_element(div0_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				placeholder: true
    			});

    			t2 = claim_space(div0_nodes);
    			if (if_block0) if_block0.l(div0_nodes);
    			t3 = claim_space(div0_nodes);
    			if (if_block1) if_block1.l(div0_nodes);
    			t4 = claim_space(div0_nodes);
    			if (if_block2) if_block2.l(div0_nodes);
    			div0_nodes.forEach(detach_dev);
    			t5 = claim_space(form_nodes);
    			div1 = claim_element(form_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			label1 = claim_element(div1_nodes, "LABEL", { for: true });
    			var label1_nodes = children(label1);
    			t6 = claim_text(label1_nodes, "Surname");
    			label1_nodes.forEach(detach_dev);
    			t7 = claim_space(div1_nodes);

    			input1 = claim_element(div1_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				placeholder: true
    			});

    			t8 = claim_space(div1_nodes);
    			if (if_block3) if_block3.l(div1_nodes);
    			t9 = claim_space(div1_nodes);
    			if (if_block4) if_block4.l(div1_nodes);
    			t10 = claim_space(div1_nodes);
    			if (if_block5) if_block5.l(div1_nodes);
    			div1_nodes.forEach(detach_dev);
    			t11 = claim_space(form_nodes);
    			div2 = claim_element(form_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			label2 = claim_element(div2_nodes, "LABEL", { for: true });
    			var label2_nodes = children(label2);
    			t12 = claim_text(label2_nodes, "Email address");
    			label2_nodes.forEach(detach_dev);
    			t13 = claim_space(div2_nodes);

    			input2 = claim_element(div2_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				"aria-describedby": true,
    				placeholder: true
    			});

    			t14 = claim_space(div2_nodes);
    			if (if_block6) if_block6.l(div2_nodes);
    			t15 = claim_space(div2_nodes);
    			if (if_block7) if_block7.l(div2_nodes);
    			t16 = claim_space(div2_nodes);
    			if (if_block8) if_block8.l(div2_nodes);
    			t17 = claim_space(div2_nodes);
    			if (if_block9) if_block9.l(div2_nodes);
    			div2_nodes.forEach(detach_dev);
    			t18 = claim_space(form_nodes);
    			div3 = claim_element(form_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			label3 = claim_element(div3_nodes, "LABEL", { for: true });
    			var label3_nodes = children(label3);
    			t19 = claim_text(label3_nodes, "Password");
    			label3_nodes.forEach(detach_dev);
    			t20 = claim_space(div3_nodes);

    			input3 = claim_element(div3_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				placeholder: true
    			});

    			t21 = claim_space(div3_nodes);
    			if (if_block10) if_block10.l(div3_nodes);
    			t22 = claim_space(div3_nodes);
    			if (if_block11) if_block11.l(div3_nodes);
    			t23 = claim_space(div3_nodes);
    			if (if_block12) if_block12.l(div3_nodes);
    			div3_nodes.forEach(detach_dev);
    			t24 = claim_space(form_nodes);
    			div4 = claim_element(form_nodes, "DIV", { class: true });
    			var div4_nodes = children(div4);
    			label4 = claim_element(div4_nodes, "LABEL", { for: true });
    			var label4_nodes = children(label4);
    			t25 = claim_text(label4_nodes, "Confirm Password");
    			label4_nodes.forEach(detach_dev);
    			t26 = claim_space(div4_nodes);

    			input4 = claim_element(div4_nodes, "INPUT", {
    				type: true,
    				class: true,
    				id: true,
    				placeholder: true
    			});

    			t27 = claim_space(div4_nodes);
    			if (if_block13) if_block13.l(div4_nodes);
    			t28 = claim_space(div4_nodes);
    			if (if_block14) if_block14.l(div4_nodes);
    			div4_nodes.forEach(detach_dev);
    			t29 = claim_space(form_nodes);
    			if (if_block15) if_block15.l(form_nodes);
    			t30 = claim_space(form_nodes);
    			div5 = claim_element(form_nodes, "DIV", { class: true });
    			var div5_nodes = children(div5);
    			claim_component(link.$$.fragment, div5_nodes);
    			t31 = claim_space(div5_nodes);
    			button = claim_element(div5_nodes, "BUTTON", { type: true, class: true });
    			var button_nodes = children(button);
    			t32 = claim_text(button_nodes, "Register");
    			button_nodes.forEach(detach_dev);
    			div5_nodes.forEach(detach_dev);
    			form_nodes.forEach(detach_dev);
    			div6_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(label0, "for", "exampleInputEmail1");
    			add_location(label0, file$2, 69, 12, 1580);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "exampleInputName");
    			attr_dev(input0, "placeholder", "Enter name");
    			add_location(input0, file$2, 70, 12, 1638);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$2, 68, 8, 1542);
    			attr_dev(label1, "for", "exampleInputEmail1");
    			add_location(label1, file$2, 83, 12, 2309);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "exampleInputSurname");
    			attr_dev(input1, "placeholder", "Enter surname");
    			add_location(input1, file$2, 84, 12, 2370);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$2, 82, 8, 2271);
    			attr_dev(label2, "for", "exampleInputEmail1");
    			add_location(label2, file$2, 97, 12, 3071);
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "id", "exampleInputEmail1");
    			attr_dev(input2, "aria-describedby", "emailHelp");
    			attr_dev(input2, "placeholder", "Enter email");
    			add_location(input2, file$2, 98, 12, 3138);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$2, 96, 8, 3033);
    			attr_dev(label3, "for", "exampleInputPassword1");
    			add_location(label3, file$2, 114, 12, 4061);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "id", "exampleInputPassword1");
    			attr_dev(input3, "placeholder", "Password");
    			add_location(input3, file$2, 115, 12, 4126);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$2, 113, 8, 4023);
    			attr_dev(label4, "for", "exampleInputPassword1");
    			add_location(label4, file$2, 128, 12, 4841);
    			attr_dev(input4, "type", "password");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "id", "exampleInputPassword2");
    			attr_dev(input4, "placeholder", "Password");
    			add_location(input4, file$2, 129, 12, 4914);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file$2, 127, 8, 4803);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file$2, 145, 12, 5724);
    			attr_dev(div5, "class", "action svelte-1cmpm85");
    			add_location(div5, file$2, 141, 8, 5584);
    			attr_dev(form, "class", "svelte-1cmpm85");
    			add_location(form, file$2, 67, 4, 1526);
    			attr_dev(div6, "class", "wrapper svelte-1cmpm85");
    			add_location(div6, file$2, 66, 0, 1499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, form);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*name*/ ctx[2]);
    			append_dev(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t3);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t4);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(form, t5);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, input1);
    			set_input_value(input1, /*surname*/ ctx[3]);
    			append_dev(div1, t8);
    			if (if_block3) if_block3.m(div1, null);
    			append_dev(div1, t9);
    			if (if_block4) if_block4.m(div1, null);
    			append_dev(div1, t10);
    			if (if_block5) if_block5.m(div1, null);
    			append_dev(form, t11);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(label2, t12);
    			append_dev(div2, t13);
    			append_dev(div2, input2);
    			set_input_value(input2, /*email*/ ctx[4]);
    			append_dev(div2, t14);
    			if (if_block6) if_block6.m(div2, null);
    			append_dev(div2, t15);
    			if (if_block7) if_block7.m(div2, null);
    			append_dev(div2, t16);
    			if (if_block8) if_block8.m(div2, null);
    			append_dev(div2, t17);
    			if (if_block9) if_block9.m(div2, null);
    			append_dev(form, t18);
    			append_dev(form, div3);
    			append_dev(div3, label3);
    			append_dev(label3, t19);
    			append_dev(div3, t20);
    			append_dev(div3, input3);
    			set_input_value(input3, /*password1*/ ctx[5]);
    			append_dev(div3, t21);
    			if (if_block10) if_block10.m(div3, null);
    			append_dev(div3, t22);
    			if (if_block11) if_block11.m(div3, null);
    			append_dev(div3, t23);
    			if (if_block12) if_block12.m(div3, null);
    			append_dev(form, t24);
    			append_dev(form, div4);
    			append_dev(div4, label4);
    			append_dev(label4, t25);
    			append_dev(div4, t26);
    			append_dev(div4, input4);
    			set_input_value(input4, /*password2*/ ctx[6]);
    			append_dev(div4, t27);
    			if (if_block13) if_block13.m(div4, null);
    			append_dev(div4, t28);
    			if (if_block14) if_block14.m(div4, null);
    			append_dev(form, t29);
    			if (if_block15) if_block15.m(form, null);
    			append_dev(form, t30);
    			append_dev(form, div5);
    			mount_component(link, div5, null);
    			append_dev(div5, t31);
    			append_dev(div5, button);
    			append_dev(button, t32);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen_dev(input0, "keyup", /*onKeyup*/ ctx[9], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[12]),
    					listen_dev(input1, "keyup", /*onKeyup*/ ctx[9], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[13]),
    					listen_dev(input2, "keyup", /*onKeyup*/ ctx[9], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[14]),
    					listen_dev(input3, "keyup", /*onKeyup*/ ctx[9], false, false, false),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[15]),
    					listen_dev(input4, "keyup", /*onKeyup*/ ctx[9], false, false, false),
    					listen_dev(button, "click", /*onSubmit*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 4 && input0.value !== /*name*/ ctx[2]) {
    				set_input_value(input0, /*name*/ ctx[2]);
    			}

    			if (/*name*/ ctx[2].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_15(ctx);
    					if_block0.c();
    					if_block0.m(div0, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*name*/ ctx[2].length !== 0 && /*name*/ ctx[2].length < 2 && /*submitClicked*/ ctx[0]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_14(ctx);
    					if_block1.c();
    					if_block1.m(div0, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*name*/ ctx[2].length > 32 && /*submitClicked*/ ctx[0]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_13(ctx);
    					if_block2.c();
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*surname*/ 8 && input1.value !== /*surname*/ ctx[3]) {
    				set_input_value(input1, /*surname*/ ctx[3]);
    			}

    			if (/*surname*/ ctx[3].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_12(ctx);
    					if_block3.c();
    					if_block3.m(div1, t9);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*surname*/ ctx[3].length !== 0 && /*surname*/ ctx[3].length < 2 && /*submitClicked*/ ctx[0]) {
    				if (if_block4) ; else {
    					if_block4 = create_if_block_11(ctx);
    					if_block4.c();
    					if_block4.m(div1, t10);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*surname*/ ctx[3].length > 32 && /*submitClicked*/ ctx[0]) {
    				if (if_block5) ; else {
    					if_block5 = create_if_block_10(ctx);
    					if_block5.c();
    					if_block5.m(div1, null);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty & /*email*/ 16 && input2.value !== /*email*/ ctx[4]) {
    				set_input_value(input2, /*email*/ ctx[4]);
    			}

    			if (/*email*/ ctx[4].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block6) ; else {
    					if_block6 = create_if_block_9(ctx);
    					if_block6.c();
    					if_block6.m(div2, t15);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*email*/ ctx[4].length !== 0 && /*email*/ ctx[4].length < 6 && /*submitClicked*/ ctx[0]) {
    				if (if_block7) ; else {
    					if_block7 = create_if_block_8(ctx);
    					if_block7.c();
    					if_block7.m(div2, t16);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*email*/ ctx[4].length > 64 && /*submitClicked*/ ctx[0]) {
    				if (if_block8) ; else {
    					if_block8 = create_if_block_7$1(ctx);
    					if_block8.c();
    					if_block8.m(div2, t17);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (dirty & /*email, submitClicked*/ 17) show_if_1 = /*email*/ ctx[4].length >= 6 && /*email*/ ctx[4].length <= 64 && !/*authService*/ ctx[7].emailRegex.test(/*email*/ ctx[4]) && /*submitClicked*/ ctx[0];

    			if (show_if_1) {
    				if (if_block9) ; else {
    					if_block9 = create_if_block_6$1(ctx);
    					if_block9.c();
    					if_block9.m(div2, null);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (dirty & /*password1*/ 32 && input3.value !== /*password1*/ ctx[5]) {
    				set_input_value(input3, /*password1*/ ctx[5]);
    			}

    			if (/*password1*/ ctx[5].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block10) ; else {
    					if_block10 = create_if_block_5$1(ctx);
    					if_block10.c();
    					if_block10.m(div3, t22);
    				}
    			} else if (if_block10) {
    				if_block10.d(1);
    				if_block10 = null;
    			}

    			if (/*password1*/ ctx[5].length !== 0 && /*password1*/ ctx[5].length < 6 && /*submitClicked*/ ctx[0]) {
    				if (if_block11) ; else {
    					if_block11 = create_if_block_4$1(ctx);
    					if_block11.c();
    					if_block11.m(div3, t23);
    				}
    			} else if (if_block11) {
    				if_block11.d(1);
    				if_block11 = null;
    			}

    			if (/*password1*/ ctx[5].length > 64 && /*submitClicked*/ ctx[0]) {
    				if (if_block12) ; else {
    					if_block12 = create_if_block_3$1(ctx);
    					if_block12.c();
    					if_block12.m(div3, null);
    				}
    			} else if (if_block12) {
    				if_block12.d(1);
    				if_block12 = null;
    			}

    			if (dirty & /*password2*/ 64 && input4.value !== /*password2*/ ctx[6]) {
    				set_input_value(input4, /*password2*/ ctx[6]);
    			}

    			if (/*password2*/ ctx[6].length === 0 && /*submitClicked*/ ctx[0]) {
    				if (if_block13) ; else {
    					if_block13 = create_if_block_2$1(ctx);
    					if_block13.c();
    					if_block13.m(div4, t28);
    				}
    			} else if (if_block13) {
    				if_block13.d(1);
    				if_block13 = null;
    			}

    			if (/*password2*/ ctx[6].length !== 0 && /*password1*/ ctx[5] !== /*password2*/ ctx[6] && /*submitClicked*/ ctx[0]) {
    				if (if_block14) ; else {
    					if_block14 = create_if_block_1$2(ctx);
    					if_block14.c();
    					if_block14.m(div4, null);
    				}
    			} else if (if_block14) {
    				if_block14.d(1);
    				if_block14 = null;
    			}

    			if (dirty & /*registerError*/ 2) show_if = /*registerError*/ ctx[1] && /*isValidInputs*/ ctx[8]();

    			if (show_if) {
    				if (if_block15) ; else {
    					if_block15 = create_if_block$2(ctx);
    					if_block15.c();
    					if_block15.m(form, t30);
    				}
    			} else if (if_block15) {
    				if_block15.d(1);
    				if_block15 = null;
    			}

    			const link_changes = {};

    			if (dirty & /*$$scope*/ 65536) {
    				link_changes.$$scope = { dirty, ctx };
    			}

    			link.$set(link_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (if_block10) if_block10.d();
    			if (if_block11) if_block11.d();
    			if (if_block12) if_block12.d();
    			if (if_block13) if_block13.d();
    			if (if_block14) if_block14.d();
    			if (if_block15) if_block15.d();
    			destroy_component(link);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let submitClicked = false;
    	let registerError = false;
    	let name = "", surname = "", email = "", password1 = "", password2 = "";
    	const authService = AuthService.getInstance();

    	onMount(() => {
    		authService.deleteToken();
    	});

    	function isValidInputs() {
    		return name.length >= 2 && name.length <= 32 && (surname.length >= 2 && surname.length <= 32) && (email.length >= 6 && email.length <= 64) && authService.emailRegex.test(email) && (password1.length >= 6 && password1.length <= 64) && password1 === password2;
    	}

    	function onKeyup(event) {
    		if (event.keyCode === 13) {
    			onSubmit();
    		}
    	}

    	async function onSubmit() {
    		$$invalidate(0, submitClicked = true);

    		if (isValidInputs()) {
    			let res = await authService.register(name, surname, email, password1);

    			if (!res.error) {
    				authService.setToken(res.token);
    				navigate("/");
    			} else {
    				$$invalidate(1, registerError = true);
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Register> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Register", $$slots, []);

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(2, name);
    	}

    	function input1_input_handler() {
    		surname = this.value;
    		$$invalidate(3, surname);
    	}

    	function input2_input_handler() {
    		email = this.value;
    		$$invalidate(4, email);
    	}

    	function input3_input_handler() {
    		password1 = this.value;
    		$$invalidate(5, password1);
    	}

    	function input4_input_handler() {
    		password2 = this.value;
    		$$invalidate(6, password2);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Link,
    		navigate,
    		AuthService,
    		submitClicked,
    		registerError,
    		name,
    		surname,
    		email,
    		password1,
    		password2,
    		authService,
    		isValidInputs,
    		onKeyup,
    		onSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ("submitClicked" in $$props) $$invalidate(0, submitClicked = $$props.submitClicked);
    		if ("registerError" in $$props) $$invalidate(1, registerError = $$props.registerError);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    		if ("surname" in $$props) $$invalidate(3, surname = $$props.surname);
    		if ("email" in $$props) $$invalidate(4, email = $$props.email);
    		if ("password1" in $$props) $$invalidate(5, password1 = $$props.password1);
    		if ("password2" in $$props) $$invalidate(6, password2 = $$props.password2);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		submitClicked,
    		registerError,
    		name,
    		surname,
    		email,
    		password1,
    		password2,
    		authService,
    		isValidInputs,
    		onKeyup,
    		onSubmit,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler
    	];
    }

    class Register extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Register",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\routes\Profile.svelte generated by Svelte v3.24.0 */

    const file$3 = "src\\routes\\Profile.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let span;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(/*testTS*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			t2 = text(/*testSCSS*/ ctx[1]);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			t0 = claim_text(div_nodes, /*testTS*/ ctx[0]);
    			t1 = claim_space(div_nodes);
    			span = claim_element(div_nodes, "SPAN", { class: true });
    			var span_nodes = children(span);
    			t2 = claim_text(span_nodes, /*testSCSS*/ ctx[1]);
    			span_nodes.forEach(detach_dev);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(span, "class", "svelte-v5ji3m");
    			add_location(span, file$3, 13, 4, 213);
    			attr_dev(div, "class", "svelte-v5ji3m");
    			add_location(div, file$3, 11, 0, 188);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let testTS = "Hello TypeScript";
    	let testSCSS = "Hello SCSS";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Profile> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Profile", $$slots, []);
    	$$self.$capture_state = () => ({ testTS, testSCSS });

    	$$self.$inject_state = $$props => {
    		if ("testTS" in $$props) $$invalidate(0, testTS = $$props.testTS);
    		if ("testSCSS" in $$props) $$invalidate(1, testSCSS = $$props.testSCSS);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [testTS, testSCSS];
    }

    class Profile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Profile",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\routes\Home.svelte generated by Svelte v3.24.0 */
    const file$4 = "src\\routes\\Home.svelte";

    // (28:4) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("blaaaaaaaa");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "blaaaaaaaa");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(28:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (21:4) {#if visible}
    function create_if_block$3(ctx) {
    	let link0;
    	let t;
    	let link1;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "/gamiyole",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link1 = new Link({
    			props: {
    				to: "/gagiyoleb",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(link0.$$.fragment);
    			t = space();
    			create_component(link1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(link0.$$.fragment, nodes);
    			t = claim_space(nodes);
    			claim_component(link1.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(link0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(link1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(link0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(link1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(21:4) {#if visible}",
    		ctx
    	});

    	return block;
    }

    // (22:8) <Link to="/gamiyole">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Gamiyole");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "Gamiyole");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(22:8) <Link to=\\\"/gamiyole\\\">",
    		ctx
    	});

    	return block;
    }

    // (25:8) <Link to="/gagiyoleb">
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Gagiyoleb");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "Gagiyoleb");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(25:8) <Link to=\\\"/gagiyoleb\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*visible*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true });
    			var div_nodes = children(div);
    			if_block.l(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "class", "wrapper");
    			add_location(div, file$4, 19, 0, 391);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let visible = false;
    	const authService = AuthService.getInstance();

    	onMount(() => {
    		authService.validateTokenAndNavigate().then(res => {
    			if (res) {
    				$$invalidate(0, visible = true);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);

    	$$self.$capture_state = () => ({
    		onMount,
    		Link,
    		navigate,
    		AuthService,
    		visible,
    		authService
    	});

    	$$self.$inject_state = $$props => {
    		if ("visible" in $$props) $$invalidate(0, visible = $$props.visible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [visible];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\routes\Gamiyole.svelte generated by Svelte v3.24.0 */

    function create_fragment$7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("gamiyole");
    		},
    		l: function claim(nodes) {
    			t = claim_text(nodes, "gamiyole");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Gamiyole> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Gamiyole", $$slots, []);
    	return [];
    }

    class Gamiyole extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Gamiyole",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    class GoogleService {
        constructor() {

        }

        static getInstance() {
            return this._instance || (this._instance = new this());
        }

        static get apiKey() {
            return 'AIzaSyCAqZrL_-ZKPZ4q4gd_ct4SsLB39md6dd0';
        }

        async getSuggestedPlaces(place) {
            const res = await (await fetch(`${googleAPIUrl}place/autocomplete/json?input=${place}&key=${GoogleService.apiKey}`)).json();
            return res;
        }
    }

    /* src\routes\Gagiyoleb.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file$5 = "src\\routes\\Gagiyoleb.svelte";

    function create_fragment$8(ctx) {
    	let div4;
    	let form;
    	let div0;
    	let label0;
    	let t0_value = (/*fromUni*/ ctx[0] ? "To" : "From") + "";
    	let t0;
    	let t1;
    	let input0;
    	let input0_placeholder_value;
    	let t2;
    	let div1;
    	let label1;
    	let t3;
    	let t4;
    	let input1;
    	let t5;
    	let div2;
    	let label2;
    	let t6;
    	let t7;
    	let input2;
    	let t8;
    	let div3;
    	let button;
    	let t9;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			label1 = element("label");
    			t3 = text("Time");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			div2 = element("div");
    			label2 = element("label");
    			t6 = text("Number of Seats");
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			div3 = element("div");
    			button = element("button");
    			t9 = text("Gagiyoleb");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div4 = claim_element(nodes, "DIV", { class: true });
    			var div4_nodes = children(div4);
    			form = claim_element(div4_nodes, "FORM", { class: true });
    			var form_nodes = children(form);
    			div0 = claim_element(form_nodes, "DIV", { class: true });
    			var div0_nodes = children(div0);
    			label0 = claim_element(div0_nodes, "LABEL", {});
    			var label0_nodes = children(label0);
    			t0 = claim_text(label0_nodes, t0_value);
    			label0_nodes.forEach(detach_dev);
    			t1 = claim_space(div0_nodes);

    			input0 = claim_element(div0_nodes, "INPUT", {
    				type: true,
    				class: true,
    				placeholder: true
    			});

    			div0_nodes.forEach(detach_dev);
    			t2 = claim_space(form_nodes);
    			div1 = claim_element(form_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			label1 = claim_element(div1_nodes, "LABEL", {});
    			var label1_nodes = children(label1);
    			t3 = claim_text(label1_nodes, "Time");
    			label1_nodes.forEach(detach_dev);
    			t4 = claim_space(div1_nodes);

    			input1 = claim_element(div1_nodes, "INPUT", {
    				type: true,
    				class: true,
    				placeholder: true
    			});

    			div1_nodes.forEach(detach_dev);
    			t5 = claim_space(form_nodes);
    			div2 = claim_element(form_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			label2 = claim_element(div2_nodes, "LABEL", {});
    			var label2_nodes = children(label2);
    			t6 = claim_text(label2_nodes, "Number of Seats");
    			label2_nodes.forEach(detach_dev);
    			t7 = claim_space(div2_nodes);

    			input2 = claim_element(div2_nodes, "INPUT", {
    				type: true,
    				class: true,
    				placeholder: true
    			});

    			div2_nodes.forEach(detach_dev);
    			t8 = claim_space(form_nodes);
    			div3 = claim_element(form_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			button = claim_element(div3_nodes, "BUTTON", { type: true, class: true });
    			var button_nodes = children(button);
    			t9 = claim_text(button_nodes, "Gagiyoleb");
    			button_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			form_nodes.forEach(detach_dev);
    			div4_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(label0, file$5, 83, 12, 1798);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", input0_placeholder_value = /*fromUni*/ ctx[0] ? "To" : "From");
    			add_location(input0, file$5, 84, 12, 1852);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$5, 82, 8, 1760);
    			add_location(label1, file$5, 88, 12, 2041);
    			attr_dev(input1, "type", "time");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Time");
    			add_location(input1, file$5, 89, 12, 2074);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$5, 87, 8, 2003);
    			add_location(label2, file$5, 93, 12, 2235);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "placeholder", "Number of Seats");
    			add_location(input2, file$5, 94, 12, 2279);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$5, 92, 8, 2197);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file$5, 98, 12, 2450);
    			attr_dev(div3, "class", "action svelte-rnsfl4");
    			add_location(div3, file$5, 97, 8, 2416);
    			attr_dev(form, "class", "svelte-rnsfl4");
    			add_location(form, file$5, 81, 4, 1744);
    			attr_dev(div4, "class", "wrapper svelte-rnsfl4");
    			add_location(div4, file$5, 80, 0, 1717);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, form);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*destination*/ ctx[1]);
    			append_dev(form, t2);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*time*/ ctx[3]);
    			append_dev(form, t5);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(label2, t6);
    			append_dev(div2, t7);
    			append_dev(div2, input2);
    			set_input_value(input2, /*seats*/ ctx[2]);
    			append_dev(form, t8);
    			append_dev(form, div3);
    			append_dev(div3, button);
    			append_dev(button, t9);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[6]),
    					listen_dev(button, "click", onSubmit, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fromUni*/ 1 && t0_value !== (t0_value = (/*fromUni*/ ctx[0] ? "To" : "From") + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*fromUni*/ 1 && input0_placeholder_value !== (input0_placeholder_value = /*fromUni*/ ctx[0] ? "To" : "From")) {
    				attr_dev(input0, "placeholder", input0_placeholder_value);
    			}

    			if (dirty & /*destination*/ 2 && input0.value !== /*destination*/ ctx[1]) {
    				set_input_value(input0, /*destination*/ ctx[1]);
    			}

    			if (dirty & /*time*/ 8) {
    				set_input_value(input1, /*time*/ ctx[3]);
    			}

    			if (dirty & /*seats*/ 4 && to_number(input2.value) !== /*seats*/ ctx[2]) {
    				set_input_value(input2, /*seats*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function onSubmit() {
    	console.log("submit");
    }

    function onKeyup(event) {
    	
    }

    function instance$8($$self, $$props, $$invalidate) {
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
    			console.log(distanceFromCenter);

    			if (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) {
    				$$invalidate(0, fromUni = true);
    			} else {
    				$$invalidate(0, fromUni = false);
    			}
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Gagiyoleb> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Gagiyoleb", $$slots, []);

    	function input0_input_handler() {
    		destination = this.value;
    		$$invalidate(1, destination);
    	}

    	function input1_input_handler() {
    		time = this.value;
    		$$invalidate(3, time);
    	}

    	function input2_input_handler() {
    		seats = to_number(this.value);
    		$$invalidate(2, seats);
    	}

    	$$self.$capture_state = () => ({
    		DeviceDetectorService,
    		GoogleService,
    		googleService,
    		dateHours,
    		dateMinutes,
    		fromUni,
    		destination,
    		seats,
    		time,
    		isAtUni,
    		onSubmit,
    		onKeyup
    	});

    	$$self.$inject_state = $$props => {
    		if ("fromUni" in $$props) $$invalidate(0, fromUni = $$props.fromUni);
    		if ("destination" in $$props) $$invalidate(1, destination = $$props.destination);
    		if ("seats" in $$props) $$invalidate(2, seats = $$props.seats);
    		if ("time" in $$props) $$invalidate(3, time = $$props.time);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 8) {
    			 {
    				console.log(time);
    			}
    		}

    		if ($$self.$$.dirty & /*seats*/ 4) {
    			 {
    				console.log(seats);
    			}
    		}

    		if ($$self.$$.dirty & /*destination*/ 2) {
    			 {
    				if (DeviceDetectorService.isBrowser) {
    					console.log(destination);

    					googleService.getSuggestedPlaces(destination).then(res => {
    						console.log(res);
    					});
    				}
    			}
    		}
    	};

    	return [
    		fromUni,
    		destination,
    		seats,
    		time,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class Gagiyoleb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Gagiyoleb",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.24.0 */

    // (15:0) <Router url="{url}">
    function create_default_slot$3(ctx) {
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let t2;
    	let route3;
    	let t3;
    	let route4;
    	let t4;
    	let route5;
    	let current;

    	route0 = new Route({
    			props: { path: "login", component: Login },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "register", component: Register },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "profile", component: Profile },
    			$$inline: true
    		});

    	route3 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route4 = new Route({
    			props: { path: "gamiyole", component: Gamiyole },
    			$$inline: true
    		});

    	route5 = new Route({
    			props: { path: "gagiyoleb", component: Gagiyoleb },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			t2 = space();
    			create_component(route3.$$.fragment);
    			t3 = space();
    			create_component(route4.$$.fragment);
    			t4 = space();
    			create_component(route5.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(route0.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			claim_component(route1.$$.fragment, nodes);
    			t1 = claim_space(nodes);
    			claim_component(route2.$$.fragment, nodes);
    			t2 = claim_space(nodes);
    			claim_component(route3.$$.fragment, nodes);
    			t3 = claim_space(nodes);
    			claim_component(route4.$$.fragment, nodes);
    			t4 = claim_space(nodes);
    			claim_component(route5.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route4, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(route5, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			transition_in(route4.$$.fragment, local);
    			transition_in(route5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(route3, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(route4, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(route5, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(15:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(router.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { url = "" } = $$props;
    	const writable_props = ["url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({
    		Router,
    		Route,
    		Link,
    		Login,
    		Register,
    		Profile,
    		Home,
    		Gamiyole,
    		Gagiyoleb,
    		url
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    new App({
      target: document.getElementById("app"),
      hydrate: true
    });

}());
//# sourceMappingURL=bundle.js.map
