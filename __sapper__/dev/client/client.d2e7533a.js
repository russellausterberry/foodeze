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
function is_empty(obj) {
    return Object.keys(obj).length === 0;
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

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
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
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_svg_attributes(node, attributes) {
    for (const key in attributes) {
        attr(node, key, attributes[key]);
    }
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
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}
function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
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
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
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
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
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
        set_current_component(null);
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

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
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
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
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
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.27.0' }, detail)));
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
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
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

const CONTEXT_KEY = {};

/* src/components/Nav.svelte generated by Svelte v3.27.0 */

const file = "src/components/Nav.svelte";

function create_fragment(ctx) {
	let nav;
	let ul;
	let li0;
	let a0;
	let t0;
	let a0_aria_current_value;
	let t1;
	let li1;
	let a1;
	let t2;
	let a1_aria_current_value;
	let t3;
	let li2;
	let a2;
	let t4;
	let a2_aria_current_value;
	let t5;
	let li3;
	let a3;
	let t6;
	let a3_aria_current_value;

	const block = {
		c: function create() {
			nav = element("nav");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("home");
			t1 = space();
			li1 = element("li");
			a1 = element("a");
			t2 = text("about");
			t3 = space();
			li2 = element("li");
			a2 = element("a");
			t4 = text("blog");
			t5 = space();
			li3 = element("li");
			a3 = element("a");
			t6 = text("Availability");
			this.h();
		},
		l: function claim(nodes) {
			nav = claim_element(nodes, "NAV", { class: true });
			var nav_nodes = children(nav);
			ul = claim_element(nav_nodes, "UL", { class: true });
			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", { class: true });
			var li0_nodes = children(li0);

			a0 = claim_element(li0_nodes, "A", {
				"aria-current": true,
				href: true,
				class: true
			});

			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "home");
			a0_nodes.forEach(detach_dev);
			li0_nodes.forEach(detach_dev);
			t1 = claim_space(ul_nodes);
			li1 = claim_element(ul_nodes, "LI", { class: true });
			var li1_nodes = children(li1);

			a1 = claim_element(li1_nodes, "A", {
				"aria-current": true,
				href: true,
				class: true
			});

			var a1_nodes = children(a1);
			t2 = claim_text(a1_nodes, "about");
			a1_nodes.forEach(detach_dev);
			li1_nodes.forEach(detach_dev);
			t3 = claim_space(ul_nodes);
			li2 = claim_element(ul_nodes, "LI", { class: true });
			var li2_nodes = children(li2);

			a2 = claim_element(li2_nodes, "A", {
				rel: true,
				"aria-current": true,
				href: true,
				class: true
			});

			var a2_nodes = children(a2);
			t4 = claim_text(a2_nodes, "blog");
			a2_nodes.forEach(detach_dev);
			li2_nodes.forEach(detach_dev);
			t5 = claim_space(ul_nodes);
			li3 = claim_element(ul_nodes, "LI", { class: true });
			var li3_nodes = children(li3);

			a3 = claim_element(li3_nodes, "A", {
				"aria-current": true,
				href: true,
				class: true
			});

			var a3_nodes = children(a3);
			t6 = claim_text(a3_nodes, "Availability");
			a3_nodes.forEach(detach_dev);
			li3_nodes.forEach(detach_dev);
			ul_nodes.forEach(detach_dev);
			nav_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(a0, "aria-current", a0_aria_current_value = /*segment*/ ctx[0] === undefined ? "page" : undefined);
			attr_dev(a0, "href", ".");
			attr_dev(a0, "class", "svelte-1dbd5up");
			add_location(a0, file, 52, 6, 653);
			attr_dev(li0, "class", "svelte-1dbd5up");
			add_location(li0, file, 52, 2, 649);
			attr_dev(a1, "aria-current", a1_aria_current_value = /*segment*/ ctx[0] === "about" ? "page" : undefined);
			attr_dev(a1, "href", "about");
			attr_dev(a1, "class", "svelte-1dbd5up");
			add_location(a1, file, 53, 6, 745);
			attr_dev(li1, "class", "svelte-1dbd5up");
			add_location(li1, file, 53, 2, 741);
			attr_dev(a2, "rel", "prefetch");
			attr_dev(a2, "aria-current", a2_aria_current_value = /*segment*/ ctx[0] === "blog" ? "page" : undefined);
			attr_dev(a2, "href", "blog");
			attr_dev(a2, "class", "svelte-1dbd5up");
			add_location(a2, file, 57, 6, 998);
			attr_dev(li2, "class", "svelte-1dbd5up");
			add_location(li2, file, 57, 2, 994);

			attr_dev(a3, "aria-current", a3_aria_current_value = /*segment*/ ctx[0] === "availability"
			? "page"
			: undefined);

			attr_dev(a3, "href", "availability");
			attr_dev(a3, "class", "svelte-1dbd5up");
			add_location(a3, file, 58, 6, 1103);
			attr_dev(li3, "class", "svelte-1dbd5up");
			add_location(li3, file, 58, 2, 1099);
			attr_dev(ul, "class", "svelte-1dbd5up");
			add_location(ul, file, 51, 1, 642);
			attr_dev(nav, "class", "svelte-1dbd5up");
			add_location(nav, file, 50, 0, 635);
		},
		m: function mount(target, anchor) {
			insert_dev(target, nav, anchor);
			append_dev(nav, ul);
			append_dev(ul, li0);
			append_dev(li0, a0);
			append_dev(a0, t0);
			append_dev(ul, t1);
			append_dev(ul, li1);
			append_dev(li1, a1);
			append_dev(a1, t2);
			append_dev(ul, t3);
			append_dev(ul, li2);
			append_dev(li2, a2);
			append_dev(a2, t4);
			append_dev(ul, t5);
			append_dev(ul, li3);
			append_dev(li3, a3);
			append_dev(a3, t6);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*segment*/ 1 && a0_aria_current_value !== (a0_aria_current_value = /*segment*/ ctx[0] === undefined ? "page" : undefined)) {
				attr_dev(a0, "aria-current", a0_aria_current_value);
			}

			if (dirty & /*segment*/ 1 && a1_aria_current_value !== (a1_aria_current_value = /*segment*/ ctx[0] === "about" ? "page" : undefined)) {
				attr_dev(a1, "aria-current", a1_aria_current_value);
			}

			if (dirty & /*segment*/ 1 && a2_aria_current_value !== (a2_aria_current_value = /*segment*/ ctx[0] === "blog" ? "page" : undefined)) {
				attr_dev(a2, "aria-current", a2_aria_current_value);
			}

			if (dirty & /*segment*/ 1 && a3_aria_current_value !== (a3_aria_current_value = /*segment*/ ctx[0] === "availability"
			? "page"
			: undefined)) {
				attr_dev(a3, "aria-current", a3_aria_current_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(nav);
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
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Nav", slots, []);
	let { segment } = $$props;
	const writable_props = ["segment"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("segment" in $$props) $$invalidate(0, segment = $$props.segment);
	};

	$$self.$capture_state = () => ({ segment });

	$$self.$inject_state = $$props => {
		if ("segment" in $$props) $$invalidate(0, segment = $$props.segment);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [segment];
}

class Nav extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { segment: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Nav",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*segment*/ ctx[0] === undefined && !("segment" in props)) {
			console.warn("<Nav> was created without expected prop 'segment'");
		}
	}

	get segment() {
		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set segment(value) {
		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/routes/_layout.svelte generated by Svelte v3.27.0 */
const file$1 = "src/routes/_layout.svelte";

function create_fragment$1(ctx) {
	let nav;
	let t;
	let main;
	let current;

	nav = new Nav({
			props: { segment: /*segment*/ ctx[0] },
			$$inline: true
		});

	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	const block = {
		c: function create() {
			create_component(nav.$$.fragment);
			t = space();
			main = element("main");
			if (default_slot) default_slot.c();
			this.h();
		},
		l: function claim(nodes) {
			claim_component(nav.$$.fragment, nodes);
			t = claim_space(nodes);
			main = claim_element(nodes, "MAIN", { class: true });
			var main_nodes = children(main);
			if (default_slot) default_slot.l(main_nodes);
			main_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			attr_dev(main, "class", "svelte-1uhnsl8");
			add_location(main, file$1, 19, 0, 262);
		},
		m: function mount(target, anchor) {
			mount_component(nav, target, anchor);
			insert_dev(target, t, anchor);
			insert_dev(target, main, anchor);

			if (default_slot) {
				default_slot.m(main, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			const nav_changes = {};
			if (dirty & /*segment*/ 1) nav_changes.segment = /*segment*/ ctx[0];
			nav.$set(nav_changes);

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 2) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(nav.$$.fragment, local);
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(nav.$$.fragment, local);
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(nav, detaching);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(main);
			if (default_slot) default_slot.d(detaching);
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
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Layout", slots, ['default']);
	let { segment } = $$props;
	const writable_props = ["segment"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Layout> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("segment" in $$props) $$invalidate(0, segment = $$props.segment);
		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({ Nav, segment });

	$$self.$inject_state = $$props => {
		if ("segment" in $$props) $$invalidate(0, segment = $$props.segment);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [segment, $$scope, slots];
}

class Layout extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { segment: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Layout",
			options,
			id: create_fragment$1.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*segment*/ ctx[0] === undefined && !("segment" in props)) {
			console.warn("<Layout> was created without expected prop 'segment'");
		}
	}

	get segment() {
		throw new Error("<Layout>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set segment(value) {
		throw new Error("<Layout>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

var root_comp = /*#__PURE__*/Object.freeze({
    __proto__: null,
    'default': Layout
});

/* src/routes/_error.svelte generated by Svelte v3.27.0 */

const { Error: Error_1 } = globals;
const file$2 = "src/routes/_error.svelte";

// (38:0) {#if dev && error.stack}
function create_if_block(ctx) {
	let pre;
	let t_value = /*error*/ ctx[1].stack + "";
	let t;

	const block = {
		c: function create() {
			pre = element("pre");
			t = text(t_value);
			this.h();
		},
		l: function claim(nodes) {
			pre = claim_element(nodes, "PRE", {});
			var pre_nodes = children(pre);
			t = claim_text(pre_nodes, t_value);
			pre_nodes.forEach(detach_dev);
			this.h();
		},
		h: function hydrate() {
			add_location(pre, file$2, 38, 1, 443);
		},
		m: function mount(target, anchor) {
			insert_dev(target, pre, anchor);
			append_dev(pre, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*error*/ 2 && t_value !== (t_value = /*error*/ ctx[1].stack + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(pre);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(38:0) {#if dev && error.stack}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let title_value;
	let t0;
	let h1;
	let t1;
	let t2;
	let p;
	let t3_value = /*error*/ ctx[1].message + "";
	let t3;
	let t4;
	let if_block_anchor;
	document.title = title_value = /*status*/ ctx[0];
	let if_block = /*dev*/ ctx[2] && /*error*/ ctx[1].stack && create_if_block(ctx);

	const block = {
		c: function create() {
			t0 = space();
			h1 = element("h1");
			t1 = text(/*status*/ ctx[0]);
			t2 = space();
			p = element("p");
			t3 = text(t3_value);
			t4 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.h();
		},
		l: function claim(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-1o9r2ue\"]", document.head);
			head_nodes.forEach(detach_dev);
			t0 = claim_space(nodes);
			h1 = claim_element(nodes, "H1", { class: true });
			var h1_nodes = children(h1);
			t1 = claim_text(h1_nodes, /*status*/ ctx[0]);
			h1_nodes.forEach(detach_dev);
			t2 = claim_space(nodes);
			p = claim_element(nodes, "P", { class: true });
			var p_nodes = children(p);
			t3 = claim_text(p_nodes, t3_value);
			p_nodes.forEach(detach_dev);
			t4 = claim_space(nodes);
			if (if_block) if_block.l(nodes);
			if_block_anchor = empty();
			this.h();
		},
		h: function hydrate() {
			attr_dev(h1, "class", "svelte-8od9u6");
			add_location(h1, file$2, 33, 0, 374);
			attr_dev(p, "class", "svelte-8od9u6");
			add_location(p, file$2, 35, 0, 393);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t0, anchor);
			insert_dev(target, h1, anchor);
			append_dev(h1, t1);
			insert_dev(target, t2, anchor);
			insert_dev(target, p, anchor);
			append_dev(p, t3);
			insert_dev(target, t4, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*status*/ 1 && title_value !== (title_value = /*status*/ ctx[0])) {
				document.title = title_value;
			}

			if (dirty & /*status*/ 1) set_data_dev(t1, /*status*/ ctx[0]);
			if (dirty & /*error*/ 2 && t3_value !== (t3_value = /*error*/ ctx[1].message + "")) set_data_dev(t3, t3_value);

			if (/*dev*/ ctx[2] && /*error*/ ctx[1].stack) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(h1);
			if (detaching) detach_dev(t2);
			if (detaching) detach_dev(p);
			if (detaching) detach_dev(t4);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
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
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Error", slots, []);
	let { status } = $$props;
	let { error } = $$props;
	const dev = "development" === "development";
	const writable_props = ["status", "error"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Error> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("status" in $$props) $$invalidate(0, status = $$props.status);
		if ("error" in $$props) $$invalidate(1, error = $$props.error);
	};

	$$self.$capture_state = () => ({ status, error, dev });

	$$self.$inject_state = $$props => {
		if ("status" in $$props) $$invalidate(0, status = $$props.status);
		if ("error" in $$props) $$invalidate(1, error = $$props.error);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [status, error, dev];
}

class Error$1 extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { status: 0, error: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Error",
			options,
			id: create_fragment$2.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*status*/ ctx[0] === undefined && !("status" in props)) {
			console.warn("<Error> was created without expected prop 'status'");
		}

		if (/*error*/ ctx[1] === undefined && !("error" in props)) {
			console.warn("<Error> was created without expected prop 'error'");
		}
	}

	get status() {
		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set status(value) {
		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get error() {
		throw new Error_1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set error(value) {
		throw new Error_1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/node_modules/@sapper/internal/App.svelte generated by Svelte v3.27.0 */

const { Error: Error_1$1 } = globals;

// (23:1) {:else}
function create_else_block(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	const switch_instance_spread_levels = [/*level1*/ ctx[4].props];
	var switch_value = /*level1*/ ctx[4].component;

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
			const switch_instance_changes = (dirty & /*level1*/ 16)
			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*level1*/ ctx[4].props)])
			: {};

			if (switch_value !== (switch_value = /*level1*/ ctx[4].component)) {
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
		id: create_else_block.name,
		type: "else",
		source: "(23:1) {:else}",
		ctx
	});

	return block;
}

// (21:1) {#if error}
function create_if_block$1(ctx) {
	let error_1;
	let current;

	error_1 = new Error$1({
			props: {
				error: /*error*/ ctx[0],
				status: /*status*/ ctx[1]
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(error_1.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(error_1.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(error_1, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const error_1_changes = {};
			if (dirty & /*error*/ 1) error_1_changes.error = /*error*/ ctx[0];
			if (dirty & /*status*/ 2) error_1_changes.status = /*status*/ ctx[1];
			error_1.$set(error_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(error_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(error_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(error_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(21:1) {#if error}",
		ctx
	});

	return block;
}

// (20:0) <Layout segment="{segments[0]}" {...level0.props}>
function create_default_slot(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*error*/ ctx[0]) return 0;
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
		id: create_default_slot.name,
		type: "slot",
		source: "(20:0) <Layout segment=\\\"{segments[0]}\\\" {...level0.props}>",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let layout;
	let current;
	const layout_spread_levels = [{ segment: /*segments*/ ctx[2][0] }, /*level0*/ ctx[3].props];

	let layout_props = {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	};

	for (let i = 0; i < layout_spread_levels.length; i += 1) {
		layout_props = assign(layout_props, layout_spread_levels[i]);
	}

	layout = new Layout({ props: layout_props, $$inline: true });

	const block = {
		c: function create() {
			create_component(layout.$$.fragment);
		},
		l: function claim(nodes) {
			claim_component(layout.$$.fragment, nodes);
		},
		m: function mount(target, anchor) {
			mount_component(layout, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const layout_changes = (dirty & /*segments, level0*/ 12)
			? get_spread_update(layout_spread_levels, [
					dirty & /*segments*/ 4 && { segment: /*segments*/ ctx[2][0] },
					dirty & /*level0*/ 8 && get_spread_object(/*level0*/ ctx[3].props)
				])
			: {};

			if (dirty & /*$$scope, error, status, level1*/ 147) {
				layout_changes.$$scope = { dirty, ctx };
			}

			layout.$set(layout_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(layout.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(layout.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(layout, detaching);
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
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("App", slots, []);
	let { stores } = $$props;
	let { error } = $$props;
	let { status } = $$props;
	let { segments } = $$props;
	let { level0 } = $$props;
	let { level1 = null } = $$props;
	let { notify } = $$props;
	afterUpdate(notify);
	setContext(CONTEXT_KEY, stores);
	const writable_props = ["stores", "error", "status", "segments", "level0", "level1", "notify"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("stores" in $$props) $$invalidate(5, stores = $$props.stores);
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("segments" in $$props) $$invalidate(2, segments = $$props.segments);
		if ("level0" in $$props) $$invalidate(3, level0 = $$props.level0);
		if ("level1" in $$props) $$invalidate(4, level1 = $$props.level1);
		if ("notify" in $$props) $$invalidate(6, notify = $$props.notify);
	};

	$$self.$capture_state = () => ({
		setContext,
		afterUpdate,
		CONTEXT_KEY,
		Layout,
		Error: Error$1,
		stores,
		error,
		status,
		segments,
		level0,
		level1,
		notify
	});

	$$self.$inject_state = $$props => {
		if ("stores" in $$props) $$invalidate(5, stores = $$props.stores);
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("segments" in $$props) $$invalidate(2, segments = $$props.segments);
		if ("level0" in $$props) $$invalidate(3, level0 = $$props.level0);
		if ("level1" in $$props) $$invalidate(4, level1 = $$props.level1);
		if ("notify" in $$props) $$invalidate(6, notify = $$props.notify);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [error, status, segments, level0, level1, stores, notify];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
			stores: 5,
			error: 0,
			status: 1,
			segments: 2,
			level0: 3,
			level1: 4,
			notify: 6
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$3.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*stores*/ ctx[5] === undefined && !("stores" in props)) {
			console.warn("<App> was created without expected prop 'stores'");
		}

		if (/*error*/ ctx[0] === undefined && !("error" in props)) {
			console.warn("<App> was created without expected prop 'error'");
		}

		if (/*status*/ ctx[1] === undefined && !("status" in props)) {
			console.warn("<App> was created without expected prop 'status'");
		}

		if (/*segments*/ ctx[2] === undefined && !("segments" in props)) {
			console.warn("<App> was created without expected prop 'segments'");
		}

		if (/*level0*/ ctx[3] === undefined && !("level0" in props)) {
			console.warn("<App> was created without expected prop 'level0'");
		}

		if (/*notify*/ ctx[6] === undefined && !("notify" in props)) {
			console.warn("<App> was created without expected prop 'notify'");
		}
	}

	get stores() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set stores(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get error() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set error(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get status() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set status(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get segments() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set segments(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get level0() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set level0(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get level1() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set level1(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get notify() {
		throw new Error_1$1("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set notify(value) {
		throw new Error_1$1("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

// This file is generated by Sapper — do not edit it!

const ignore = [/^\/blog\.json$/, /^\/blog\/([^/]+?)\.json$/];

const components = [
	{
		js: () => Promise.all([import('./index.1fb78fec.js'), __inject_styles(["client-e118e612.css","index-39716d32.css"])]).then(function(x) { return x[0]; })
	},
	{
		js: () => Promise.all([import('./availability.b58b8b32.js'), __inject_styles(["client-e118e612.css","availability-dfea4060.css"])]).then(function(x) { return x[0]; })
	},
	{
		js: () => Promise.all([import('./about.4805d5c8.js'), __inject_styles(["client-e118e612.css"])]).then(function(x) { return x[0]; })
	},
	{
		js: () => Promise.all([import('./index.1bedda0c.js'), __inject_styles(["client-e118e612.css","index-7ed37c94.css"])]).then(function(x) { return x[0]; })
	},
	{
		js: () => Promise.all([import('./[slug].8a5e4fcc.js'), __inject_styles(["client-e118e612.css","[slug]-5bc8f95f.css"])]).then(function(x) { return x[0]; })
	}
];

const routes = (d => [
	{
		// index.svelte
		pattern: /^\/$/,
		parts: [
			{ i: 0 }
		]
	},

	{
		// availability.svelte
		pattern: /^\/availability\/?$/,
		parts: [
			{ i: 1 }
		]
	},

	{
		// about.svelte
		pattern: /^\/about\/?$/,
		parts: [
			{ i: 2 }
		]
	},

	{
		// blog/index.svelte
		pattern: /^\/blog\/?$/,
		parts: [
			{ i: 3 }
		]
	},

	{
		// blog/[slug].svelte
		pattern: /^\/blog\/([^/]+?)\/?$/,
		parts: [
			null,
			{ i: 4, params: match => ({ slug: d(match[1]) }) }
		]
	}
])(decodeURIComponent);

if (typeof window !== 'undefined') {
	Promise.all([import('./sapper-dev-client.1e7a4a5e.js'), ]).then(function(x) { return x[0]; }).then(client => {
		client.connect(10000);
	});
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function prefetch(href) {
    const target = select_target(new URL(href, document.baseURI));
    if (target) {
        if (!prefetching || href !== prefetching.href) {
            set_prefetching(href, hydrate_target(target));
        }
        return prefetching.promise;
    }
}

let uid = 1;
function set_uid(n) {
    uid = n;
}
let cid;
function set_cid(n) {
    cid = n;
}
const _history = typeof history !== 'undefined' ? history : {
    pushState: (state, title, href) => { },
    replaceState: (state, title, href) => { },
    scrollRestoration: ''
};
const scroll_history = {};
function load_current_page() {
    return Promise.resolve().then(() => {
        const { hash, href } = location;
        _history.replaceState({ id: uid }, '', href);
        const target = select_target(new URL(location.href));
        if (target)
            return navigate(target, uid, true, hash);
    });
}
let base_url;
let handle_target;
function init$1(base, handler) {
    base_url = base;
    handle_target = handler;
    if ('scrollRestoration' in _history) {
        _history.scrollRestoration = 'manual';
    }
    // Adopted from Nuxt.js
    // Reset scrollRestoration to auto when leaving page, allowing page reload
    // and back-navigation from other pages to use the browser to restore the
    // scrolling position.
    addEventListener('beforeunload', () => {
        _history.scrollRestoration = 'auto';
    });
    // Setting scrollRestoration to manual again when returning to this page.
    addEventListener('load', () => {
        _history.scrollRestoration = 'manual';
    });
    addEventListener('click', handle_click);
    addEventListener('popstate', handle_popstate);
    // prefetch
    addEventListener('touchstart', trigger_prefetch);
    addEventListener('mousemove', handle_mousemove);
}
function extract_query(search) {
    const query = Object.create(null);
    if (search.length > 0) {
        search.slice(1).split('&').forEach(searchParam => {
            const [, key, value = ''] = /([^=]*)(?:=(.*))?/.exec(decodeURIComponent(searchParam.replace(/\+/g, ' ')));
            if (typeof query[key] === 'string')
                query[key] = [query[key]];
            if (typeof query[key] === 'object')
                query[key].push(value);
            else
                query[key] = value;
        });
    }
    return query;
}
function select_target(url) {
    if (url.origin !== location.origin)
        return null;
    if (!url.pathname.startsWith(base_url))
        return null;
    let path = url.pathname.slice(base_url.length);
    if (path === '') {
        path = '/';
    }
    // avoid accidental clashes between server routes and page routes
    if (ignore.some(pattern => pattern.test(path)))
        return;
    for (let i = 0; i < routes.length; i += 1) {
        const route = routes[i];
        const match = route.pattern.exec(path);
        if (match) {
            const query = extract_query(url.search);
            const part = route.parts[route.parts.length - 1];
            const params = part.params ? part.params(match) : {};
            const page = { host: location.host, path, query, params };
            return { href: url.href, route, match, page };
        }
    }
}
let mousemove_timeout;
function handle_mousemove(event) {
    clearTimeout(mousemove_timeout);
    mousemove_timeout = setTimeout(() => {
        trigger_prefetch(event);
    }, 20);
}
function trigger_prefetch(event) {
    const a = find_anchor(event.target);
    if (!a || a.rel !== 'prefetch')
        return;
    prefetch(a.href);
}
function handle_click(event) {
    // Adapted from https://github.com/visionmedia/page.js
    // MIT license https://github.com/visionmedia/page.js#license
    if (which(event) !== 1)
        return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
    if (event.defaultPrevented)
        return;
    const a = find_anchor(event.target);
    if (!a)
        return;
    if (!a.href)
        return;
    // check if link is inside an svg
    // in this case, both href and target are always inside an object
    const svg = typeof a.href === 'object' && a.href.constructor.name === 'SVGAnimatedString';
    const href = String(svg ? a.href.baseVal : a.href);
    if (href === location.href) {
        if (!location.hash)
            event.preventDefault();
        return;
    }
    // Ignore if tag has
    // 1. 'download' attribute
    // 2. rel='external' attribute
    if (a.hasAttribute('download') || a.getAttribute('rel') === 'external')
        return;
    // Ignore if <a> has a target
    if (svg ? a.target.baseVal : a.target)
        return;
    const url = new URL(href);
    // Don't handle hash changes
    if (url.pathname === location.pathname && url.search === location.search)
        return;
    const target = select_target(url);
    if (target) {
        const noscroll = a.hasAttribute('sapper:noscroll');
        navigate(target, null, noscroll, url.hash);
        event.preventDefault();
        _history.pushState({ id: cid }, '', url.href);
    }
}
function which(event) {
    return event.which === null ? event.button : event.which;
}
function find_anchor(node) {
    while (node && node.nodeName.toUpperCase() !== 'A')
        node = node.parentNode; // SVG <a> elements have a lowercase name
    return node;
}
function scroll_state() {
    return {
        x: pageXOffset,
        y: pageYOffset
    };
}
function handle_popstate(event) {
    scroll_history[cid] = scroll_state();
    if (event.state) {
        const url = new URL(location.href);
        const target = select_target(url);
        if (target) {
            navigate(target, event.state.id);
        }
        else {
            // eslint-disable-next-line
            location.href = location.href; // nosonar
        }
    }
    else {
        // hashchange
        set_uid(uid + 1);
        set_cid(uid);
        _history.replaceState({ id: cid }, '', location.href);
    }
}
function navigate(dest, id, noscroll, hash) {
    return __awaiter(this, void 0, void 0, function* () {
        const popstate = !!id;
        if (popstate) {
            cid = id;
        }
        else {
            const current_scroll = scroll_state();
            // clicked on a link. preserve scroll state
            scroll_history[cid] = current_scroll;
            cid = id = ++uid;
            scroll_history[cid] = noscroll ? current_scroll : { x: 0, y: 0 };
        }
        yield handle_target(dest);
        if (document.activeElement && (document.activeElement instanceof HTMLElement))
            document.activeElement.blur();
        if (!noscroll) {
            let scroll = scroll_history[id];
            let deep_linked;
            if (hash) {
                // scroll is an element id (from a hash), we need to compute y.
                deep_linked = document.getElementById(hash.slice(1));
                if (deep_linked) {
                    scroll = {
                        x: 0,
                        y: deep_linked.getBoundingClientRect().top + scrollY
                    };
                }
            }
            scroll_history[cid] = scroll;
            if (popstate || deep_linked) {
                scrollTo(scroll.x, scroll.y);
            }
            else {
                scrollTo(0, 0);
            }
        }
    });
}

function goto(href, opts = { noscroll: false, replaceState: false }) {
    const target = select_target(new URL(href, document.baseURI));
    if (target) {
        _history[opts.replaceState ? 'replaceState' : 'pushState']({ id: cid }, '', href);
        return navigate(target, null, opts.noscroll).then(() => { });
    }
    location.href = href;
    return new Promise(f => { }); // never resolves
}

function page_store(value) {
    const store = writable(value);
    let ready = true;
    function notify() {
        ready = true;
        store.update(val => val);
    }
    function set(new_value) {
        ready = false;
        store.set(new_value);
    }
    function subscribe(run) {
        let old_value;
        return store.subscribe((new_value) => {
            if (old_value === undefined || (ready && new_value !== old_value)) {
                run(old_value = new_value);
            }
        });
    }
    return { notify, set, subscribe };
}

const initial_data = typeof __SAPPER__ !== 'undefined' && __SAPPER__;
let ready = false;
let root_component;
let current_token;
let root_preloaded;
let current_branch = [];
let current_query = '{}';
const stores = {
    page: page_store({}),
    preloading: writable(null),
    session: writable(initial_data && initial_data.session)
};
let $session;
let session_dirty;
stores.session.subscribe((value) => __awaiter(void 0, void 0, void 0, function* () {
    $session = value;
    if (!ready)
        return;
    session_dirty = true;
    const dest = select_target(new URL(location.href));
    const token = current_token = {};
    const { redirect, props, branch } = yield hydrate_target(dest);
    if (token !== current_token)
        return; // a secondary navigation happened while we were loading
    if (redirect) {
        yield goto(redirect.location, { replaceState: true });
    }
    else {
        yield render(branch, props, dest.page);
    }
}));
let prefetching = null;
function set_prefetching(href, promise) {
    prefetching = { href, promise };
}
let target;
function set_target(element) {
    target = element;
}
function start(opts) {
    set_target(opts.target);
    init$1(initial_data.baseUrl, handle_target$1);
    if (initial_data.error) {
        return Promise.resolve().then(() => {
            return handle_error(new URL(location.href));
        });
    }
    return load_current_page();
}
function handle_error(url) {
    const { host, pathname, search } = location;
    const { session, preloaded, status, error } = initial_data;
    if (!root_preloaded) {
        root_preloaded = preloaded && preloaded[0];
    }
    const props = {
        error,
        status,
        session,
        level0: {
            props: root_preloaded
        },
        level1: {
            props: {
                status,
                error
            },
            component: Error$1
        },
        segments: preloaded
    };
    const query = extract_query(search);
    render([], props, { host, path: pathname, query, params: {} });
}
function handle_target$1(dest) {
    return __awaiter(this, void 0, void 0, function* () {
        if (root_component)
            stores.preloading.set(true);
        const loaded = prefetching && prefetching.href === dest.href ?
            prefetching.promise :
            hydrate_target(dest);
        prefetching = null;
        const token = current_token = {};
        const loaded_result = yield loaded;
        const { redirect } = loaded_result;
        if (token !== current_token)
            return; // a secondary navigation happened while we were loading
        if (redirect) {
            yield goto(redirect.location, { replaceState: true });
        }
        else {
            const { props, branch } = loaded_result;
            yield render(branch, props, dest.page);
        }
    });
}
function render(branch, props, page) {
    return __awaiter(this, void 0, void 0, function* () {
        stores.page.set(page);
        stores.preloading.set(false);
        if (root_component) {
            root_component.$set(props);
        }
        else {
            props.stores = {
                page: { subscribe: stores.page.subscribe },
                preloading: { subscribe: stores.preloading.subscribe },
                session: stores.session
            };
            props.level0 = {
                props: yield root_preloaded
            };
            props.notify = stores.page.notify;
            root_component = new App({
                target,
                props,
                hydrate: true
            });
        }
        current_branch = branch;
        current_query = JSON.stringify(page.query);
        ready = true;
        session_dirty = false;
    });
}
function part_changed(i, segment, match, stringified_query) {
    // TODO only check query string changes for preload functions
    // that do in fact depend on it (using static analysis or
    // runtime instrumentation)
    if (stringified_query !== current_query)
        return true;
    const previous = current_branch[i];
    if (!previous)
        return false;
    if (segment !== previous.segment)
        return true;
    if (previous.match) {
        if (JSON.stringify(previous.match.slice(1, i + 2)) !== JSON.stringify(match.slice(1, i + 2))) {
            return true;
        }
    }
}
function hydrate_target(dest) {
    return __awaiter(this, void 0, void 0, function* () {
        const { route, page } = dest;
        const segments = page.path.split('/').filter(Boolean);
        let redirect = null;
        const props = { error: null, status: 200, segments: [segments[0]] };
        const preload_context = {
            fetch: (url, opts) => fetch(url, opts),
            redirect: (statusCode, location) => {
                if (redirect && (redirect.statusCode !== statusCode || redirect.location !== location)) {
                    throw new Error(`Conflicting redirects`);
                }
                redirect = { statusCode, location };
            },
            error: (status, error) => {
                props.error = typeof error === 'string' ? new Error(error) : error;
                props.status = status;
            }
        };
        if (!root_preloaded) {
            const root_preload = undefined || (() => { });
            root_preloaded = initial_data.preloaded[0] || root_preload.call(preload_context, {
                host: page.host,
                path: page.path,
                query: page.query,
                params: {}
            }, $session);
        }
        let branch;
        let l = 1;
        try {
            const stringified_query = JSON.stringify(page.query);
            const match = route.pattern.exec(page.path);
            let segment_dirty = false;
            branch = yield Promise.all(route.parts.map((part, i) => __awaiter(this, void 0, void 0, function* () {
                const segment = segments[i];
                if (part_changed(i, segment, match, stringified_query))
                    segment_dirty = true;
                props.segments[l] = segments[i + 1]; // TODO make this less confusing
                if (!part)
                    return { segment };
                const j = l++;
                if (!session_dirty && !segment_dirty && current_branch[i] && current_branch[i].part === part.i) {
                    return current_branch[i];
                }
                segment_dirty = false;
                const { default: component, preload } = yield load_component(components[part.i]);
                let preloaded;
                if (ready || !initial_data.preloaded[i + 1]) {
                    preloaded = preload
                        ? yield preload.call(preload_context, {
                            host: page.host,
                            path: page.path,
                            query: page.query,
                            params: part.params ? part.params(dest.match) : {}
                        }, $session)
                        : {};
                }
                else {
                    preloaded = initial_data.preloaded[i + 1];
                }
                return (props[`level${j}`] = { component, props: preloaded, segment, match, part: part.i });
            })));
        }
        catch (error) {
            props.error = error;
            props.status = 500;
            branch = [];
        }
        return { redirect, props, branch };
    });
}
function load_component(component) {
    const promises = [component.js()];
    return Promise.all(promises).then(values => values[0]);
}

start({
	target: document.querySelector('#sapper')
});

export { transition_out as A, globals as B, create_component as C, claim_component as D, mount_component as E, destroy_component as F, empty as G, group_outros as H, check_outros as I, validate_each_argument as J, destroy_each as K, binding_callbacks as L, bind as M, add_flush_callback as N, set_data_dev as O, SvelteComponentDev as S, space as a, detach_dev as b, claim_space as c, dispatch_dev as d, element as e, claim_element as f, children as g, claim_text as h, init as i, attr_dev as j, add_location as k, insert_dev as l, append_dev as m, noop as n, assign as o, svg_element as p, query_selector_all as q, set_svg_attributes as r, safe_not_equal as s, text as t, get_spread_update as u, validate_slots as v, create_slot as w, toggle_class as x, update_slot as y, transition_in as z };

import __inject_styles from './inject_styles.88de199d.js';//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmQyZTc1MzNhLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc3ZlbHRlL2ludGVybmFsL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdmVsdGUvc3RvcmUvaW5kZXgubWpzIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL3NoYXJlZC5tanMiLCIuLi8uLi8uLi9zcmMvY29tcG9uZW50cy9OYXYuc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL3JvdXRlcy9fbGF5b3V0LnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9yb3V0ZXMvX2Vycm9yLnN2ZWx0ZSIsIi4uLy4uLy4uL3NyYy9ub2RlX21vZHVsZXMvQHNhcHBlci9pbnRlcm5hbC9BcHAuc3ZlbHRlIiwiLi4vLi4vLi4vc3JjL25vZGVfbW9kdWxlcy9Ac2FwcGVyL2ludGVybmFsL21hbmlmZXN0LWNsaWVudC5tanMiLCIuLi8uLi8uLi9zcmMvbm9kZV9tb2R1bGVzL0BzYXBwZXIvYXBwLm1qcyIsIi4uLy4uLy4uL3NyYy9jbGllbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gbm9vcCgpIHsgfVxuY29uc3QgaWRlbnRpdHkgPSB4ID0+IHg7XG5mdW5jdGlvbiBhc3NpZ24odGFyLCBzcmMpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgZm9yIChjb25zdCBrIGluIHNyYylcbiAgICAgICAgdGFyW2tdID0gc3JjW2tdO1xuICAgIHJldHVybiB0YXI7XG59XG5mdW5jdGlvbiBpc19wcm9taXNlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbic7XG59XG5mdW5jdGlvbiBhZGRfbG9jYXRpb24oZWxlbWVudCwgZmlsZSwgbGluZSwgY29sdW1uLCBjaGFyKSB7XG4gICAgZWxlbWVudC5fX3N2ZWx0ZV9tZXRhID0ge1xuICAgICAgICBsb2M6IHsgZmlsZSwgbGluZSwgY29sdW1uLCBjaGFyIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gcnVuKGZuKSB7XG4gICAgcmV0dXJuIGZuKCk7XG59XG5mdW5jdGlvbiBibGFua19vYmplY3QoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5jcmVhdGUobnVsbCk7XG59XG5mdW5jdGlvbiBydW5fYWxsKGZucykge1xuICAgIGZucy5mb3JFYWNoKHJ1bik7XG59XG5mdW5jdGlvbiBpc19mdW5jdGlvbih0aGluZykge1xuICAgIHJldHVybiB0eXBlb2YgdGhpbmcgPT09ICdmdW5jdGlvbic7XG59XG5mdW5jdGlvbiBzYWZlX25vdF9lcXVhbChhLCBiKSB7XG4gICAgcmV0dXJuIGEgIT0gYSA/IGIgPT0gYiA6IGEgIT09IGIgfHwgKChhICYmIHR5cGVvZiBhID09PSAnb2JqZWN0JykgfHwgdHlwZW9mIGEgPT09ICdmdW5jdGlvbicpO1xufVxuZnVuY3Rpb24gbm90X2VxdWFsKGEsIGIpIHtcbiAgICByZXR1cm4gYSAhPSBhID8gYiA9PSBiIDogYSAhPT0gYjtcbn1cbmZ1bmN0aW9uIGlzX2VtcHR5KG9iaikge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlX3N0b3JlKHN0b3JlLCBuYW1lKSB7XG4gICAgaWYgKHN0b3JlICE9IG51bGwgJiYgdHlwZW9mIHN0b3JlLnN1YnNjcmliZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCcke25hbWV9JyBpcyBub3QgYSBzdG9yZSB3aXRoIGEgJ3N1YnNjcmliZScgbWV0aG9kYCk7XG4gICAgfVxufVxuZnVuY3Rpb24gc3Vic2NyaWJlKHN0b3JlLCAuLi5jYWxsYmFja3MpIHtcbiAgICBpZiAoc3RvcmUgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbm9vcDtcbiAgICB9XG4gICAgY29uc3QgdW5zdWIgPSBzdG9yZS5zdWJzY3JpYmUoLi4uY2FsbGJhY2tzKTtcbiAgICByZXR1cm4gdW5zdWIudW5zdWJzY3JpYmUgPyAoKSA9PiB1bnN1Yi51bnN1YnNjcmliZSgpIDogdW5zdWI7XG59XG5mdW5jdGlvbiBnZXRfc3RvcmVfdmFsdWUoc3RvcmUpIHtcbiAgICBsZXQgdmFsdWU7XG4gICAgc3Vic2NyaWJlKHN0b3JlLCBfID0+IHZhbHVlID0gXykoKTtcbiAgICByZXR1cm4gdmFsdWU7XG59XG5mdW5jdGlvbiBjb21wb25lbnRfc3Vic2NyaWJlKGNvbXBvbmVudCwgc3RvcmUsIGNhbGxiYWNrKSB7XG4gICAgY29tcG9uZW50LiQkLm9uX2Rlc3Ryb3kucHVzaChzdWJzY3JpYmUoc3RvcmUsIGNhbGxiYWNrKSk7XG59XG5mdW5jdGlvbiBjcmVhdGVfc2xvdChkZWZpbml0aW9uLCBjdHgsICQkc2NvcGUsIGZuKSB7XG4gICAgaWYgKGRlZmluaXRpb24pIHtcbiAgICAgICAgY29uc3Qgc2xvdF9jdHggPSBnZXRfc2xvdF9jb250ZXh0KGRlZmluaXRpb24sIGN0eCwgJCRzY29wZSwgZm4pO1xuICAgICAgICByZXR1cm4gZGVmaW5pdGlvblswXShzbG90X2N0eCk7XG4gICAgfVxufVxuZnVuY3Rpb24gZ2V0X3Nsb3RfY29udGV4dChkZWZpbml0aW9uLCBjdHgsICQkc2NvcGUsIGZuKSB7XG4gICAgcmV0dXJuIGRlZmluaXRpb25bMV0gJiYgZm5cbiAgICAgICAgPyBhc3NpZ24oJCRzY29wZS5jdHguc2xpY2UoKSwgZGVmaW5pdGlvblsxXShmbihjdHgpKSlcbiAgICAgICAgOiAkJHNjb3BlLmN0eDtcbn1cbmZ1bmN0aW9uIGdldF9zbG90X2NoYW5nZXMoZGVmaW5pdGlvbiwgJCRzY29wZSwgZGlydHksIGZuKSB7XG4gICAgaWYgKGRlZmluaXRpb25bMl0gJiYgZm4pIHtcbiAgICAgICAgY29uc3QgbGV0cyA9IGRlZmluaXRpb25bMl0oZm4oZGlydHkpKTtcbiAgICAgICAgaWYgKCQkc2NvcGUuZGlydHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGxldHM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBsZXRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29uc3QgbWVyZ2VkID0gW107XG4gICAgICAgICAgICBjb25zdCBsZW4gPSBNYXRoLm1heCgkJHNjb3BlLmRpcnR5Lmxlbmd0aCwgbGV0cy5sZW5ndGgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIG1lcmdlZFtpXSA9ICQkc2NvcGUuZGlydHlbaV0gfCBsZXRzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lcmdlZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJCRzY29wZS5kaXJ0eSB8IGxldHM7XG4gICAgfVxuICAgIHJldHVybiAkJHNjb3BlLmRpcnR5O1xufVxuZnVuY3Rpb24gdXBkYXRlX3Nsb3Qoc2xvdCwgc2xvdF9kZWZpbml0aW9uLCBjdHgsICQkc2NvcGUsIGRpcnR5LCBnZXRfc2xvdF9jaGFuZ2VzX2ZuLCBnZXRfc2xvdF9jb250ZXh0X2ZuKSB7XG4gICAgY29uc3Qgc2xvdF9jaGFuZ2VzID0gZ2V0X3Nsb3RfY2hhbmdlcyhzbG90X2RlZmluaXRpb24sICQkc2NvcGUsIGRpcnR5LCBnZXRfc2xvdF9jaGFuZ2VzX2ZuKTtcbiAgICBpZiAoc2xvdF9jaGFuZ2VzKSB7XG4gICAgICAgIGNvbnN0IHNsb3RfY29udGV4dCA9IGdldF9zbG90X2NvbnRleHQoc2xvdF9kZWZpbml0aW9uLCBjdHgsICQkc2NvcGUsIGdldF9zbG90X2NvbnRleHRfZm4pO1xuICAgICAgICBzbG90LnAoc2xvdF9jb250ZXh0LCBzbG90X2NoYW5nZXMpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGV4Y2x1ZGVfaW50ZXJuYWxfcHJvcHMocHJvcHMpIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGsgaW4gcHJvcHMpXG4gICAgICAgIGlmIChrWzBdICE9PSAnJCcpXG4gICAgICAgICAgICByZXN1bHRba10gPSBwcm9wc1trXTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gY29tcHV0ZV9yZXN0X3Byb3BzKHByb3BzLCBrZXlzKSB7XG4gICAgY29uc3QgcmVzdCA9IHt9O1xuICAgIGtleXMgPSBuZXcgU2V0KGtleXMpO1xuICAgIGZvciAoY29uc3QgayBpbiBwcm9wcylcbiAgICAgICAgaWYgKCFrZXlzLmhhcyhrKSAmJiBrWzBdICE9PSAnJCcpXG4gICAgICAgICAgICByZXN0W2tdID0gcHJvcHNba107XG4gICAgcmV0dXJuIHJlc3Q7XG59XG5mdW5jdGlvbiBjb21wdXRlX3Nsb3RzKHNsb3RzKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gc2xvdHMpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gb25jZShmbikge1xuICAgIGxldCByYW4gPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKHJhbilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgICAgZm4uY2FsbCh0aGlzLCAuLi5hcmdzKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gbnVsbF90b19lbXB0eSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZTtcbn1cbmZ1bmN0aW9uIHNldF9zdG9yZV92YWx1ZShzdG9yZSwgcmV0LCB2YWx1ZSA9IHJldCkge1xuICAgIHN0b3JlLnNldCh2YWx1ZSk7XG4gICAgcmV0dXJuIHJldDtcbn1cbmNvbnN0IGhhc19wcm9wID0gKG9iaiwgcHJvcCkgPT4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG5mdW5jdGlvbiBhY3Rpb25fZGVzdHJveWVyKGFjdGlvbl9yZXN1bHQpIHtcbiAgICByZXR1cm4gYWN0aW9uX3Jlc3VsdCAmJiBpc19mdW5jdGlvbihhY3Rpb25fcmVzdWx0LmRlc3Ryb3kpID8gYWN0aW9uX3Jlc3VsdC5kZXN0cm95IDogbm9vcDtcbn1cblxuY29uc3QgaXNfY2xpZW50ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCc7XG5sZXQgbm93ID0gaXNfY2xpZW50XG4gICAgPyAoKSA9PiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KClcbiAgICA6ICgpID0+IERhdGUubm93KCk7XG5sZXQgcmFmID0gaXNfY2xpZW50ID8gY2IgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNiKSA6IG5vb3A7XG4vLyB1c2VkIGludGVybmFsbHkgZm9yIHRlc3RpbmdcbmZ1bmN0aW9uIHNldF9ub3coZm4pIHtcbiAgICBub3cgPSBmbjtcbn1cbmZ1bmN0aW9uIHNldF9yYWYoZm4pIHtcbiAgICByYWYgPSBmbjtcbn1cblxuY29uc3QgdGFza3MgPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBydW5fdGFza3Mobm93KSB7XG4gICAgdGFza3MuZm9yRWFjaCh0YXNrID0+IHtcbiAgICAgICAgaWYgKCF0YXNrLmMobm93KSkge1xuICAgICAgICAgICAgdGFza3MuZGVsZXRlKHRhc2spO1xuICAgICAgICAgICAgdGFzay5mKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodGFza3Muc2l6ZSAhPT0gMClcbiAgICAgICAgcmFmKHJ1bl90YXNrcyk7XG59XG4vKipcbiAqIEZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXG4gKi9cbmZ1bmN0aW9uIGNsZWFyX2xvb3BzKCkge1xuICAgIHRhc2tzLmNsZWFyKCk7XG59XG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgdGFzayB0aGF0IHJ1bnMgb24gZWFjaCByYWYgZnJhbWVcbiAqIHVudGlsIGl0IHJldHVybnMgYSBmYWxzeSB2YWx1ZSBvciBpcyBhYm9ydGVkXG4gKi9cbmZ1bmN0aW9uIGxvb3AoY2FsbGJhY2spIHtcbiAgICBsZXQgdGFzaztcbiAgICBpZiAodGFza3Muc2l6ZSA9PT0gMClcbiAgICAgICAgcmFmKHJ1bl90YXNrcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcHJvbWlzZTogbmV3IFByb21pc2UoZnVsZmlsbCA9PiB7XG4gICAgICAgICAgICB0YXNrcy5hZGQodGFzayA9IHsgYzogY2FsbGJhY2ssIGY6IGZ1bGZpbGwgfSk7XG4gICAgICAgIH0pLFxuICAgICAgICBhYm9ydCgpIHtcbiAgICAgICAgICAgIHRhc2tzLmRlbGV0ZSh0YXNrKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZCh0YXJnZXQsIG5vZGUpIHtcbiAgICB0YXJnZXQuYXBwZW5kQ2hpbGQobm9kZSk7XG59XG5mdW5jdGlvbiBpbnNlcnQodGFyZ2V0LCBub2RlLCBhbmNob3IpIHtcbiAgICB0YXJnZXQuaW5zZXJ0QmVmb3JlKG5vZGUsIGFuY2hvciB8fCBudWxsKTtcbn1cbmZ1bmN0aW9uIGRldGFjaChub2RlKSB7XG4gICAgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xufVxuZnVuY3Rpb24gZGVzdHJveV9lYWNoKGl0ZXJhdGlvbnMsIGRldGFjaGluZykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlcmF0aW9ucy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBpZiAoaXRlcmF0aW9uc1tpXSlcbiAgICAgICAgICAgIGl0ZXJhdGlvbnNbaV0uZChkZXRhY2hpbmcpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGVsZW1lbnQobmFtZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUpO1xufVxuZnVuY3Rpb24gZWxlbWVudF9pcyhuYW1lLCBpcykge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUsIHsgaXMgfSk7XG59XG5mdW5jdGlvbiBvYmplY3Rfd2l0aG91dF9wcm9wZXJ0aWVzKG9iaiwgZXhjbHVkZSkge1xuICAgIGNvbnN0IHRhcmdldCA9IHt9O1xuICAgIGZvciAoY29uc3QgayBpbiBvYmopIHtcbiAgICAgICAgaWYgKGhhc19wcm9wKG9iaiwgaylcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICYmIGV4Y2x1ZGUuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIHRhcmdldFtrXSA9IG9ialtrXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xufVxuZnVuY3Rpb24gc3ZnX2VsZW1lbnQobmFtZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbmFtZSk7XG59XG5mdW5jdGlvbiB0ZXh0KGRhdGEpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSk7XG59XG5mdW5jdGlvbiBzcGFjZSgpIHtcbiAgICByZXR1cm4gdGV4dCgnICcpO1xufVxuZnVuY3Rpb24gZW1wdHkoKSB7XG4gICAgcmV0dXJuIHRleHQoJycpO1xufVxuZnVuY3Rpb24gbGlzdGVuKG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICByZXR1cm4gKCkgPT4gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBvcHRpb25zKTtcbn1cbmZ1bmN0aW9uIHByZXZlbnRfZGVmYXVsdChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICByZXR1cm4gZm4uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHN0b3BfcHJvcGFnYXRpb24oZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJldHVybiBmbi5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICB9O1xufVxuZnVuY3Rpb24gc2VsZihmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSB0aGlzKVxuICAgICAgICAgICAgZm4uY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIGF0dHIobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKVxuICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICAgIGVsc2UgaWYgKG5vZGUuZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSkgIT09IHZhbHVlKVxuICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHNldF9hdHRyaWJ1dGVzKG5vZGUsIGF0dHJpYnV0ZXMpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgY29uc3QgZGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhub2RlLl9fcHJvdG9fXyk7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICBpZiAoYXR0cmlidXRlc1trZXldID09IG51bGwpIHtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGtleSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnc3R5bGUnKSB7XG4gICAgICAgICAgICBub2RlLnN0eWxlLmNzc1RleHQgPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoa2V5ID09PSAnX192YWx1ZScpIHtcbiAgICAgICAgICAgIG5vZGUudmFsdWUgPSBub2RlW2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGVzY3JpcHRvcnNba2V5XSAmJiBkZXNjcmlwdG9yc1trZXldLnNldCkge1xuICAgICAgICAgICAgbm9kZVtrZXldID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXR0cihub2RlLCBrZXksIGF0dHJpYnV0ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBzZXRfc3ZnX2F0dHJpYnV0ZXMobm9kZSwgYXR0cmlidXRlcykge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgYXR0cihub2RlLCBrZXksIGF0dHJpYnV0ZXNba2V5XSk7XG4gICAgfVxufVxuZnVuY3Rpb24gc2V0X2N1c3RvbV9lbGVtZW50X2RhdGEobm9kZSwgcHJvcCwgdmFsdWUpIHtcbiAgICBpZiAocHJvcCBpbiBub2RlKSB7XG4gICAgICAgIG5vZGVbcHJvcF0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGF0dHIobm9kZSwgcHJvcCwgdmFsdWUpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHhsaW5rX2F0dHIobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIG5vZGUuc2V0QXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBhdHRyaWJ1dGUsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIGdldF9iaW5kaW5nX2dyb3VwX3ZhbHVlKGdyb3VwLCBfX3ZhbHVlLCBjaGVja2VkKSB7XG4gICAgY29uc3QgdmFsdWUgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBncm91cC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBpZiAoZ3JvdXBbaV0uY2hlY2tlZClcbiAgICAgICAgICAgIHZhbHVlLmFkZChncm91cFtpXS5fX3ZhbHVlKTtcbiAgICB9XG4gICAgaWYgKCFjaGVja2VkKSB7XG4gICAgICAgIHZhbHVlLmRlbGV0ZShfX3ZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIEFycmF5LmZyb20odmFsdWUpO1xufVxuZnVuY3Rpb24gdG9fbnVtYmVyKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSAnJyA/IG51bGwgOiArdmFsdWU7XG59XG5mdW5jdGlvbiB0aW1lX3Jhbmdlc190b19hcnJheShyYW5nZXMpIHtcbiAgICBjb25zdCBhcnJheSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmFuZ2VzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGFycmF5LnB1c2goeyBzdGFydDogcmFuZ2VzLnN0YXJ0KGkpLCBlbmQ6IHJhbmdlcy5lbmQoaSkgfSk7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbn1cbmZ1bmN0aW9uIGNoaWxkcmVuKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShlbGVtZW50LmNoaWxkTm9kZXMpO1xufVxuZnVuY3Rpb24gY2xhaW1fZWxlbWVudChub2RlcywgbmFtZSwgYXR0cmlidXRlcywgc3ZnKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb25zdCBub2RlID0gbm9kZXNbaV07XG4gICAgICAgIGlmIChub2RlLm5vZGVOYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgICBsZXQgaiA9IDA7XG4gICAgICAgICAgICBjb25zdCByZW1vdmUgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlIChqIDwgbm9kZS5hdHRyaWJ1dGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZSA9IG5vZGUuYXR0cmlidXRlc1tqKytdO1xuICAgICAgICAgICAgICAgIGlmICghYXR0cmlidXRlc1thdHRyaWJ1dGUubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlLnB1c2goYXR0cmlidXRlLm5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcmVtb3ZlLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUocmVtb3ZlW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub2Rlcy5zcGxpY2UoaSwgMSlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN2ZyA/IHN2Z19lbGVtZW50KG5hbWUpIDogZWxlbWVudChuYW1lKTtcbn1cbmZ1bmN0aW9uIGNsYWltX3RleHQobm9kZXMsIGRhdGEpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgIG5vZGUuZGF0YSA9ICcnICsgZGF0YTtcbiAgICAgICAgICAgIHJldHVybiBub2Rlcy5zcGxpY2UoaSwgMSlbMF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRleHQoZGF0YSk7XG59XG5mdW5jdGlvbiBjbGFpbV9zcGFjZShub2Rlcykge1xuICAgIHJldHVybiBjbGFpbV90ZXh0KG5vZGVzLCAnICcpO1xufVxuZnVuY3Rpb24gc2V0X2RhdGEodGV4dCwgZGF0YSkge1xuICAgIGRhdGEgPSAnJyArIGRhdGE7XG4gICAgaWYgKHRleHQud2hvbGVUZXh0ICE9PSBkYXRhKVxuICAgICAgICB0ZXh0LmRhdGEgPSBkYXRhO1xufVxuZnVuY3Rpb24gc2V0X2lucHV0X3ZhbHVlKGlucHV0LCB2YWx1ZSkge1xuICAgIGlucHV0LnZhbHVlID0gdmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWU7XG59XG5mdW5jdGlvbiBzZXRfaW5wdXRfdHlwZShpbnB1dCwgdHlwZSkge1xuICAgIHRyeSB7XG4gICAgICAgIGlucHV0LnR5cGUgPSB0eXBlO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgfVxufVxuZnVuY3Rpb24gc2V0X3N0eWxlKG5vZGUsIGtleSwgdmFsdWUsIGltcG9ydGFudCkge1xuICAgIG5vZGUuc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZSwgaW1wb3J0YW50ID8gJ2ltcG9ydGFudCcgOiAnJyk7XG59XG5mdW5jdGlvbiBzZWxlY3Rfb3B0aW9uKHNlbGVjdCwgdmFsdWUpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdC5vcHRpb25zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IHNlbGVjdC5vcHRpb25zW2ldO1xuICAgICAgICBpZiAob3B0aW9uLl9fdmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gc2VsZWN0X29wdGlvbnMoc2VsZWN0LCB2YWx1ZSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0Lm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uID0gc2VsZWN0Lm9wdGlvbnNbaV07XG4gICAgICAgIG9wdGlvbi5zZWxlY3RlZCA9IH52YWx1ZS5pbmRleE9mKG9wdGlvbi5fX3ZhbHVlKTtcbiAgICB9XG59XG5mdW5jdGlvbiBzZWxlY3RfdmFsdWUoc2VsZWN0KSB7XG4gICAgY29uc3Qgc2VsZWN0ZWRfb3B0aW9uID0gc2VsZWN0LnF1ZXJ5U2VsZWN0b3IoJzpjaGVja2VkJykgfHwgc2VsZWN0Lm9wdGlvbnNbMF07XG4gICAgcmV0dXJuIHNlbGVjdGVkX29wdGlvbiAmJiBzZWxlY3RlZF9vcHRpb24uX192YWx1ZTtcbn1cbmZ1bmN0aW9uIHNlbGVjdF9tdWx0aXBsZV92YWx1ZShzZWxlY3QpIHtcbiAgICByZXR1cm4gW10ubWFwLmNhbGwoc2VsZWN0LnF1ZXJ5U2VsZWN0b3JBbGwoJzpjaGVja2VkJyksIG9wdGlvbiA9PiBvcHRpb24uX192YWx1ZSk7XG59XG4vLyB1bmZvcnR1bmF0ZWx5IHRoaXMgY2FuJ3QgYmUgYSBjb25zdGFudCBhcyB0aGF0IHdvdWxkbid0IGJlIHRyZWUtc2hha2VhYmxlXG4vLyBzbyB3ZSBjYWNoZSB0aGUgcmVzdWx0IGluc3RlYWRcbmxldCBjcm9zc29yaWdpbjtcbmZ1bmN0aW9uIGlzX2Nyb3Nzb3JpZ2luKCkge1xuICAgIGlmIChjcm9zc29yaWdpbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNyb3Nzb3JpZ2luID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnBhcmVudCkge1xuICAgICAgICAgICAgICAgIHZvaWQgd2luZG93LnBhcmVudC5kb2N1bWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNyb3Nzb3JpZ2luID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3Jvc3NvcmlnaW47XG59XG5mdW5jdGlvbiBhZGRfcmVzaXplX2xpc3RlbmVyKG5vZGUsIGZuKSB7XG4gICAgY29uc3QgY29tcHV0ZWRfc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuICAgIGNvbnN0IHpfaW5kZXggPSAocGFyc2VJbnQoY29tcHV0ZWRfc3R5bGUuekluZGV4KSB8fCAwKSAtIDE7XG4gICAgaWYgKGNvbXB1dGVkX3N0eWxlLnBvc2l0aW9uID09PSAnc3RhdGljJykge1xuICAgICAgICBub2RlLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICB9XG4gICAgY29uc3QgaWZyYW1lID0gZWxlbWVudCgnaWZyYW1lJyk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgZGlzcGxheTogYmxvY2s7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwOyBsZWZ0OiAwOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlOyBgICtcbiAgICAgICAgYG92ZXJmbG93OiBoaWRkZW47IGJvcmRlcjogMDsgb3BhY2l0eTogMDsgcG9pbnRlci1ldmVudHM6IG5vbmU7IHotaW5kZXg6ICR7el9pbmRleH07YCk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIGlmcmFtZS50YWJJbmRleCA9IC0xO1xuICAgIGNvbnN0IGNyb3Nzb3JpZ2luID0gaXNfY3Jvc3NvcmlnaW4oKTtcbiAgICBsZXQgdW5zdWJzY3JpYmU7XG4gICAgaWYgKGNyb3Nzb3JpZ2luKSB7XG4gICAgICAgIGlmcmFtZS5zcmMgPSBgZGF0YTp0ZXh0L2h0bWwsPHNjcmlwdD5vbnJlc2l6ZT1mdW5jdGlvbigpe3BhcmVudC5wb3N0TWVzc2FnZSgwLCcqJyl9PC9zY3JpcHQ+YDtcbiAgICAgICAgdW5zdWJzY3JpYmUgPSBsaXN0ZW4od2luZG93LCAnbWVzc2FnZScsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gaWZyYW1lLmNvbnRlbnRXaW5kb3cpXG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZnJhbWUuc3JjID0gJ2Fib3V0OmJsYW5rJztcbiAgICAgICAgaWZyYW1lLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlID0gbGlzdGVuKGlmcmFtZS5jb250ZW50V2luZG93LCAncmVzaXplJywgZm4pO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBhcHBlbmQobm9kZSwgaWZyYW1lKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBpZiAoY3Jvc3NvcmlnaW4pIHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodW5zdWJzY3JpYmUgJiYgaWZyYW1lLmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH1cbiAgICAgICAgZGV0YWNoKGlmcmFtZSk7XG4gICAgfTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZV9jbGFzcyhlbGVtZW50LCBuYW1lLCB0b2dnbGUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdFt0b2dnbGUgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbn1cbmZ1bmN0aW9uIGN1c3RvbV9ldmVudCh0eXBlLCBkZXRhaWwpIHtcbiAgICBjb25zdCBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlLCBkZXRhaWwpO1xuICAgIHJldHVybiBlO1xufVxuZnVuY3Rpb24gcXVlcnlfc2VsZWN0b3JfYWxsKHNlbGVjdG9yLCBwYXJlbnQgPSBkb2N1bWVudC5ib2R5KSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20ocGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbn1cbmNsYXNzIEh0bWxUYWcge1xuICAgIGNvbnN0cnVjdG9yKGFuY2hvciA9IG51bGwpIHtcbiAgICAgICAgdGhpcy5hID0gYW5jaG9yO1xuICAgICAgICB0aGlzLmUgPSB0aGlzLm4gPSBudWxsO1xuICAgIH1cbiAgICBtKGh0bWwsIHRhcmdldCwgYW5jaG9yID0gbnVsbCkge1xuICAgICAgICBpZiAoIXRoaXMuZSkge1xuICAgICAgICAgICAgdGhpcy5lID0gZWxlbWVudCh0YXJnZXQubm9kZU5hbWUpO1xuICAgICAgICAgICAgdGhpcy50ID0gdGFyZ2V0O1xuICAgICAgICAgICAgdGhpcy5oKGh0bWwpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaShhbmNob3IpO1xuICAgIH1cbiAgICBoKGh0bWwpIHtcbiAgICAgICAgdGhpcy5lLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIHRoaXMubiA9IEFycmF5LmZyb20odGhpcy5lLmNoaWxkTm9kZXMpO1xuICAgIH1cbiAgICBpKGFuY2hvcikge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubi5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaW5zZXJ0KHRoaXMudCwgdGhpcy5uW2ldLCBhbmNob3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHAoaHRtbCkge1xuICAgICAgICB0aGlzLmQoKTtcbiAgICAgICAgdGhpcy5oKGh0bWwpO1xuICAgICAgICB0aGlzLmkodGhpcy5hKTtcbiAgICB9XG4gICAgZCgpIHtcbiAgICAgICAgdGhpcy5uLmZvckVhY2goZGV0YWNoKTtcbiAgICB9XG59XG5cbmNvbnN0IGFjdGl2ZV9kb2NzID0gbmV3IFNldCgpO1xubGV0IGFjdGl2ZSA9IDA7XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZGFya3NreWFwcC9zdHJpbmctaGFzaC9ibG9iL21hc3Rlci9pbmRleC5qc1xuZnVuY3Rpb24gaGFzaChzdHIpIHtcbiAgICBsZXQgaGFzaCA9IDUzODE7XG4gICAgbGV0IGkgPSBzdHIubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pXG4gICAgICAgIGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSBeIHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgIHJldHVybiBoYXNoID4+PiAwO1xufVxuZnVuY3Rpb24gY3JlYXRlX3J1bGUobm9kZSwgYSwgYiwgZHVyYXRpb24sIGRlbGF5LCBlYXNlLCBmbiwgdWlkID0gMCkge1xuICAgIGNvbnN0IHN0ZXAgPSAxNi42NjYgLyBkdXJhdGlvbjtcbiAgICBsZXQga2V5ZnJhbWVzID0gJ3tcXG4nO1xuICAgIGZvciAobGV0IHAgPSAwOyBwIDw9IDE7IHAgKz0gc3RlcCkge1xuICAgICAgICBjb25zdCB0ID0gYSArIChiIC0gYSkgKiBlYXNlKHApO1xuICAgICAgICBrZXlmcmFtZXMgKz0gcCAqIDEwMCArIGAleyR7Zm4odCwgMSAtIHQpfX1cXG5gO1xuICAgIH1cbiAgICBjb25zdCBydWxlID0ga2V5ZnJhbWVzICsgYDEwMCUgeyR7Zm4oYiwgMSAtIGIpfX1cXG59YDtcbiAgICBjb25zdCBuYW1lID0gYF9fc3ZlbHRlXyR7aGFzaChydWxlKX1fJHt1aWR9YDtcbiAgICBjb25zdCBkb2MgPSBub2RlLm93bmVyRG9jdW1lbnQ7XG4gICAgYWN0aXZlX2RvY3MuYWRkKGRvYyk7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IGRvYy5fX3N2ZWx0ZV9zdHlsZXNoZWV0IHx8IChkb2MuX19zdmVsdGVfc3R5bGVzaGVldCA9IGRvYy5oZWFkLmFwcGVuZENoaWxkKGVsZW1lbnQoJ3N0eWxlJykpLnNoZWV0KTtcbiAgICBjb25zdCBjdXJyZW50X3J1bGVzID0gZG9jLl9fc3ZlbHRlX3J1bGVzIHx8IChkb2MuX19zdmVsdGVfcnVsZXMgPSB7fSk7XG4gICAgaWYgKCFjdXJyZW50X3J1bGVzW25hbWVdKSB7XG4gICAgICAgIGN1cnJlbnRfcnVsZXNbbmFtZV0gPSB0cnVlO1xuICAgICAgICBzdHlsZXNoZWV0Lmluc2VydFJ1bGUoYEBrZXlmcmFtZXMgJHtuYW1lfSAke3J1bGV9YCwgc3R5bGVzaGVldC5jc3NSdWxlcy5sZW5ndGgpO1xuICAgIH1cbiAgICBjb25zdCBhbmltYXRpb24gPSBub2RlLnN0eWxlLmFuaW1hdGlvbiB8fCAnJztcbiAgICBub2RlLnN0eWxlLmFuaW1hdGlvbiA9IGAke2FuaW1hdGlvbiA/IGAke2FuaW1hdGlvbn0sIGAgOiBgYH0ke25hbWV9ICR7ZHVyYXRpb259bXMgbGluZWFyICR7ZGVsYXl9bXMgMSBib3RoYDtcbiAgICBhY3RpdmUgKz0gMTtcbiAgICByZXR1cm4gbmFtZTtcbn1cbmZ1bmN0aW9uIGRlbGV0ZV9ydWxlKG5vZGUsIG5hbWUpIHtcbiAgICBjb25zdCBwcmV2aW91cyA9IChub2RlLnN0eWxlLmFuaW1hdGlvbiB8fCAnJykuc3BsaXQoJywgJyk7XG4gICAgY29uc3QgbmV4dCA9IHByZXZpb3VzLmZpbHRlcihuYW1lXG4gICAgICAgID8gYW5pbSA9PiBhbmltLmluZGV4T2YobmFtZSkgPCAwIC8vIHJlbW92ZSBzcGVjaWZpYyBhbmltYXRpb25cbiAgICAgICAgOiBhbmltID0+IGFuaW0uaW5kZXhPZignX19zdmVsdGUnKSA9PT0gLTEgLy8gcmVtb3ZlIGFsbCBTdmVsdGUgYW5pbWF0aW9uc1xuICAgICk7XG4gICAgY29uc3QgZGVsZXRlZCA9IHByZXZpb3VzLmxlbmd0aCAtIG5leHQubGVuZ3RoO1xuICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgIG5vZGUuc3R5bGUuYW5pbWF0aW9uID0gbmV4dC5qb2luKCcsICcpO1xuICAgICAgICBhY3RpdmUgLT0gZGVsZXRlZDtcbiAgICAgICAgaWYgKCFhY3RpdmUpXG4gICAgICAgICAgICBjbGVhcl9ydWxlcygpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNsZWFyX3J1bGVzKCkge1xuICAgIHJhZigoKSA9PiB7XG4gICAgICAgIGlmIChhY3RpdmUpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGFjdGl2ZV9kb2NzLmZvckVhY2goZG9jID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBkb2MuX19zdmVsdGVfc3R5bGVzaGVldDtcbiAgICAgICAgICAgIGxldCBpID0gc3R5bGVzaGVldC5jc3NSdWxlcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKVxuICAgICAgICAgICAgICAgIHN0eWxlc2hlZXQuZGVsZXRlUnVsZShpKTtcbiAgICAgICAgICAgIGRvYy5fX3N2ZWx0ZV9ydWxlcyA9IHt9O1xuICAgICAgICB9KTtcbiAgICAgICAgYWN0aXZlX2RvY3MuY2xlYXIoKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlX2FuaW1hdGlvbihub2RlLCBmcm9tLCBmbiwgcGFyYW1zKSB7XG4gICAgaWYgKCFmcm9tKVxuICAgICAgICByZXR1cm4gbm9vcDtcbiAgICBjb25zdCB0byA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKGZyb20ubGVmdCA9PT0gdG8ubGVmdCAmJiBmcm9tLnJpZ2h0ID09PSB0by5yaWdodCAmJiBmcm9tLnRvcCA9PT0gdG8udG9wICYmIGZyb20uYm90dG9tID09PSB0by5ib3R0b20pXG4gICAgICAgIHJldHVybiBub29wO1xuICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIFxuICAgIC8vIEB0cy1pZ25vcmUgdG9kbzogc2hvdWxkIHRoaXMgYmUgc2VwYXJhdGVkIGZyb20gZGVzdHJ1Y3R1cmluZz8gT3Igc3RhcnQvZW5kIGFkZGVkIHRvIHB1YmxpYyBhcGkgYW5kIGRvY3VtZW50YXRpb24/XG4gICAgc3RhcnQ6IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5LCBcbiAgICAvLyBAdHMtaWdub3JlIHRvZG86XG4gICAgZW5kID0gc3RhcnRfdGltZSArIGR1cmF0aW9uLCB0aWNrID0gbm9vcCwgY3NzIH0gPSBmbihub2RlLCB7IGZyb20sIHRvIH0sIHBhcmFtcyk7XG4gICAgbGV0IHJ1bm5pbmcgPSB0cnVlO1xuICAgIGxldCBzdGFydGVkID0gZmFsc2U7XG4gICAgbGV0IG5hbWU7XG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgIG5hbWUgPSBjcmVhdGVfcnVsZShub2RlLCAwLCAxLCBkdXJhdGlvbiwgZGVsYXksIGVhc2luZywgY3NzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRlbGF5KSB7XG4gICAgICAgICAgICBzdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzdG9wKCkge1xuICAgICAgICBpZiAoY3NzKVxuICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgbmFtZSk7XG4gICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgbG9vcChub3cgPT4ge1xuICAgICAgICBpZiAoIXN0YXJ0ZWQgJiYgbm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGFydGVkICYmIG5vdyA+PSBlbmQpIHtcbiAgICAgICAgICAgIHRpY2soMSwgMCk7XG4gICAgICAgICAgICBzdG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFydW5uaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXJ0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBub3cgLSBzdGFydF90aW1lO1xuICAgICAgICAgICAgY29uc3QgdCA9IDAgKyAxICogZWFzaW5nKHAgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBzdGFydCgpO1xuICAgIHRpY2soMCwgMSk7XG4gICAgcmV0dXJuIHN0b3A7XG59XG5mdW5jdGlvbiBmaXhfcG9zaXRpb24obm9kZSkge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICBpZiAoc3R5bGUucG9zaXRpb24gIT09ICdhYnNvbHV0ZScgJiYgc3R5bGUucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBzdHlsZTtcbiAgICAgICAgY29uc3QgYSA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIG5vZGUuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBub2RlLnN0eWxlLndpZHRoID0gd2lkdGg7XG4gICAgICAgIG5vZGUuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBhZGRfdHJhbnNmb3JtKG5vZGUsIGEpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGFkZF90cmFuc2Zvcm0obm9kZSwgYSkge1xuICAgIGNvbnN0IGIgPSBub2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmIChhLmxlZnQgIT09IGIubGVmdCB8fCBhLnRvcCAhPT0gYi50b3ApIHtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKG5vZGUpO1xuICAgICAgICBjb25zdCB0cmFuc2Zvcm0gPSBzdHlsZS50cmFuc2Zvcm0gPT09ICdub25lJyA/ICcnIDogc3R5bGUudHJhbnNmb3JtO1xuICAgICAgICBub2RlLnN0eWxlLnRyYW5zZm9ybSA9IGAke3RyYW5zZm9ybX0gdHJhbnNsYXRlKCR7YS5sZWZ0IC0gYi5sZWZ0fXB4LCAke2EudG9wIC0gYi50b3B9cHgpYDtcbiAgICB9XG59XG5cbmxldCBjdXJyZW50X2NvbXBvbmVudDtcbmZ1bmN0aW9uIHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICBjdXJyZW50X2NvbXBvbmVudCA9IGNvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGdldF9jdXJyZW50X2NvbXBvbmVudCgpIHtcbiAgICBpZiAoIWN1cnJlbnRfY29tcG9uZW50KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZ1bmN0aW9uIGNhbGxlZCBvdXRzaWRlIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbmApO1xuICAgIHJldHVybiBjdXJyZW50X2NvbXBvbmVudDtcbn1cbmZ1bmN0aW9uIGJlZm9yZVVwZGF0ZShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmJlZm9yZV91cGRhdGUucHVzaChmbik7XG59XG5mdW5jdGlvbiBvbk1vdW50KGZuKSB7XG4gICAgZ2V0X2N1cnJlbnRfY29tcG9uZW50KCkuJCQub25fbW91bnQucHVzaChmbik7XG59XG5mdW5jdGlvbiBhZnRlclVwZGF0ZShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmFmdGVyX3VwZGF0ZS5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIG9uRGVzdHJveShmbikge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLm9uX2Rlc3Ryb3kucHVzaChmbik7XG59XG5mdW5jdGlvbiBjcmVhdGVFdmVudERpc3BhdGNoZXIoKSB7XG4gICAgY29uc3QgY29tcG9uZW50ID0gZ2V0X2N1cnJlbnRfY29tcG9uZW50KCk7XG4gICAgcmV0dXJuICh0eXBlLCBkZXRhaWwpID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1t0eXBlXTtcbiAgICAgICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICAgICAgLy8gVE9ETyBhcmUgdGhlcmUgc2l0dWF0aW9ucyB3aGVyZSBldmVudHMgY291bGQgYmUgZGlzcGF0Y2hlZFxuICAgICAgICAgICAgLy8gaW4gYSBzZXJ2ZXIgKG5vbi1ET00pIGVudmlyb25tZW50P1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBjdXN0b21fZXZlbnQodHlwZSwgZGV0YWlsKTtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5zbGljZSgpLmZvckVhY2goZm4gPT4ge1xuICAgICAgICAgICAgICAgIGZuLmNhbGwoY29tcG9uZW50LCBldmVudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5mdW5jdGlvbiBzZXRDb250ZXh0KGtleSwgY29udGV4dCkge1xuICAgIGdldF9jdXJyZW50X2NvbXBvbmVudCgpLiQkLmNvbnRleHQuc2V0KGtleSwgY29udGV4dCk7XG59XG5mdW5jdGlvbiBnZXRDb250ZXh0KGtleSkge1xuICAgIHJldHVybiBnZXRfY3VycmVudF9jb21wb25lbnQoKS4kJC5jb250ZXh0LmdldChrZXkpO1xufVxuLy8gVE9ETyBmaWd1cmUgb3V0IGlmIHdlIHN0aWxsIHdhbnQgdG8gc3VwcG9ydFxuLy8gc2hvcnRoYW5kIGV2ZW50cywgb3IgaWYgd2Ugd2FudCB0byBpbXBsZW1lbnRcbi8vIGEgcmVhbCBidWJibGluZyBtZWNoYW5pc21cbmZ1bmN0aW9uIGJ1YmJsZShjb21wb25lbnQsIGV2ZW50KSB7XG4gICAgY29uc3QgY2FsbGJhY2tzID0gY29tcG9uZW50LiQkLmNhbGxiYWNrc1tldmVudC50eXBlXTtcbiAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgIGNhbGxiYWNrcy5zbGljZSgpLmZvckVhY2goZm4gPT4gZm4oZXZlbnQpKTtcbiAgICB9XG59XG5cbmNvbnN0IGRpcnR5X2NvbXBvbmVudHMgPSBbXTtcbmNvbnN0IGludHJvcyA9IHsgZW5hYmxlZDogZmFsc2UgfTtcbmNvbnN0IGJpbmRpbmdfY2FsbGJhY2tzID0gW107XG5jb25zdCByZW5kZXJfY2FsbGJhY2tzID0gW107XG5jb25zdCBmbHVzaF9jYWxsYmFja3MgPSBbXTtcbmNvbnN0IHJlc29sdmVkX3Byb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbmxldCB1cGRhdGVfc2NoZWR1bGVkID0gZmFsc2U7XG5mdW5jdGlvbiBzY2hlZHVsZV91cGRhdGUoKSB7XG4gICAgaWYgKCF1cGRhdGVfc2NoZWR1bGVkKSB7XG4gICAgICAgIHVwZGF0ZV9zY2hlZHVsZWQgPSB0cnVlO1xuICAgICAgICByZXNvbHZlZF9wcm9taXNlLnRoZW4oZmx1c2gpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRpY2soKSB7XG4gICAgc2NoZWR1bGVfdXBkYXRlKCk7XG4gICAgcmV0dXJuIHJlc29sdmVkX3Byb21pc2U7XG59XG5mdW5jdGlvbiBhZGRfcmVuZGVyX2NhbGxiYWNrKGZuKSB7XG4gICAgcmVuZGVyX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cbmZ1bmN0aW9uIGFkZF9mbHVzaF9jYWxsYmFjayhmbikge1xuICAgIGZsdXNoX2NhbGxiYWNrcy5wdXNoKGZuKTtcbn1cbmxldCBmbHVzaGluZyA9IGZhbHNlO1xuY29uc3Qgc2Vlbl9jYWxsYmFja3MgPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBpZiAoZmx1c2hpbmcpXG4gICAgICAgIHJldHVybjtcbiAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgZG8ge1xuICAgICAgICAvLyBmaXJzdCwgY2FsbCBiZWZvcmVVcGRhdGUgZnVuY3Rpb25zXG4gICAgICAgIC8vIGFuZCB1cGRhdGUgY29tcG9uZW50c1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpcnR5X2NvbXBvbmVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IGRpcnR5X2NvbXBvbmVudHNbaV07XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHVwZGF0ZShjb21wb25lbnQuJCQpO1xuICAgICAgICB9XG4gICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChudWxsKTtcbiAgICAgICAgZGlydHlfY29tcG9uZW50cy5sZW5ndGggPSAwO1xuICAgICAgICB3aGlsZSAoYmluZGluZ19jYWxsYmFja3MubGVuZ3RoKVxuICAgICAgICAgICAgYmluZGluZ19jYWxsYmFja3MucG9wKCkoKTtcbiAgICAgICAgLy8gdGhlbiwgb25jZSBjb21wb25lbnRzIGFyZSB1cGRhdGVkLCBjYWxsXG4gICAgICAgIC8vIGFmdGVyVXBkYXRlIGZ1bmN0aW9ucy4gVGhpcyBtYXkgY2F1c2VcbiAgICAgICAgLy8gc3Vic2VxdWVudCB1cGRhdGVzLi4uXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVuZGVyX2NhbGxiYWNrcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSByZW5kZXJfY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgaWYgKCFzZWVuX2NhbGxiYWNrcy5oYXMoY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgLy8gLi4uc28gZ3VhcmQgYWdhaW5zdCBpbmZpbml0ZSBsb29wc1xuICAgICAgICAgICAgICAgIHNlZW5fY2FsbGJhY2tzLmFkZChjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZW5kZXJfY2FsbGJhY2tzLmxlbmd0aCA9IDA7XG4gICAgfSB3aGlsZSAoZGlydHlfY29tcG9uZW50cy5sZW5ndGgpO1xuICAgIHdoaWxlIChmbHVzaF9jYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgICAgIGZsdXNoX2NhbGxiYWNrcy5wb3AoKSgpO1xuICAgIH1cbiAgICB1cGRhdGVfc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgZmx1c2hpbmcgPSBmYWxzZTtcbiAgICBzZWVuX2NhbGxiYWNrcy5jbGVhcigpO1xufVxuZnVuY3Rpb24gdXBkYXRlKCQkKSB7XG4gICAgaWYgKCQkLmZyYWdtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICQkLnVwZGF0ZSgpO1xuICAgICAgICBydW5fYWxsKCQkLmJlZm9yZV91cGRhdGUpO1xuICAgICAgICBjb25zdCBkaXJ0eSA9ICQkLmRpcnR5O1xuICAgICAgICAkJC5kaXJ0eSA9IFstMV07XG4gICAgICAgICQkLmZyYWdtZW50ICYmICQkLmZyYWdtZW50LnAoJCQuY3R4LCBkaXJ0eSk7XG4gICAgICAgICQkLmFmdGVyX3VwZGF0ZS5mb3JFYWNoKGFkZF9yZW5kZXJfY2FsbGJhY2spO1xuICAgIH1cbn1cblxubGV0IHByb21pc2U7XG5mdW5jdGlvbiB3YWl0KCkge1xuICAgIGlmICghcHJvbWlzZSkge1xuICAgICAgICBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlO1xufVxuZnVuY3Rpb24gZGlzcGF0Y2gobm9kZSwgZGlyZWN0aW9uLCBraW5kKSB7XG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGN1c3RvbV9ldmVudChgJHtkaXJlY3Rpb24gPyAnaW50cm8nIDogJ291dHJvJ30ke2tpbmR9YCkpO1xufVxuY29uc3Qgb3V0cm9pbmcgPSBuZXcgU2V0KCk7XG5sZXQgb3V0cm9zO1xuZnVuY3Rpb24gZ3JvdXBfb3V0cm9zKCkge1xuICAgIG91dHJvcyA9IHtcbiAgICAgICAgcjogMCxcbiAgICAgICAgYzogW10sXG4gICAgICAgIHA6IG91dHJvcyAvLyBwYXJlbnQgZ3JvdXBcbiAgICB9O1xufVxuZnVuY3Rpb24gY2hlY2tfb3V0cm9zKCkge1xuICAgIGlmICghb3V0cm9zLnIpIHtcbiAgICAgICAgcnVuX2FsbChvdXRyb3MuYyk7XG4gICAgfVxuICAgIG91dHJvcyA9IG91dHJvcy5wO1xufVxuZnVuY3Rpb24gdHJhbnNpdGlvbl9pbihibG9jaywgbG9jYWwpIHtcbiAgICBpZiAoYmxvY2sgJiYgYmxvY2suaSkge1xuICAgICAgICBvdXRyb2luZy5kZWxldGUoYmxvY2spO1xuICAgICAgICBibG9jay5pKGxvY2FsKTtcbiAgICB9XG59XG5mdW5jdGlvbiB0cmFuc2l0aW9uX291dChibG9jaywgbG9jYWwsIGRldGFjaCwgY2FsbGJhY2spIHtcbiAgICBpZiAoYmxvY2sgJiYgYmxvY2subykge1xuICAgICAgICBpZiAob3V0cm9pbmcuaGFzKGJsb2NrKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgb3V0cm9pbmcuYWRkKGJsb2NrKTtcbiAgICAgICAgb3V0cm9zLmMucHVzaCgoKSA9PiB7XG4gICAgICAgICAgICBvdXRyb2luZy5kZWxldGUoYmxvY2spO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRldGFjaClcbiAgICAgICAgICAgICAgICAgICAgYmxvY2suZCgxKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmxvY2subyhsb2NhbCk7XG4gICAgfVxufVxuY29uc3QgbnVsbF90cmFuc2l0aW9uID0geyBkdXJhdGlvbjogMCB9O1xuZnVuY3Rpb24gY3JlYXRlX2luX3RyYW5zaXRpb24obm9kZSwgZm4sIHBhcmFtcykge1xuICAgIGxldCBjb25maWcgPSBmbihub2RlLCBwYXJhbXMpO1xuICAgIGxldCBydW5uaW5nID0gZmFsc2U7XG4gICAgbGV0IGFuaW1hdGlvbl9uYW1lO1xuICAgIGxldCB0YXNrO1xuICAgIGxldCB1aWQgPSAwO1xuICAgIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgICAgIGlmIChhbmltYXRpb25fbmFtZSlcbiAgICAgICAgICAgIGRlbGV0ZV9ydWxlKG5vZGUsIGFuaW1hdGlvbl9uYW1lKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ28oKSB7XG4gICAgICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIHRpY2sgPSBub29wLCBjc3MgfSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG4gICAgICAgIGlmIChjc3MpXG4gICAgICAgICAgICBhbmltYXRpb25fbmFtZSA9IGNyZWF0ZV9ydWxlKG5vZGUsIDAsIDEsIGR1cmF0aW9uLCBkZWxheSwgZWFzaW5nLCBjc3MsIHVpZCsrKTtcbiAgICAgICAgdGljaygwLCAxKTtcbiAgICAgICAgY29uc3Qgc3RhcnRfdGltZSA9IG5vdygpICsgZGVsYXk7XG4gICAgICAgIGNvbnN0IGVuZF90aW1lID0gc3RhcnRfdGltZSArIGR1cmF0aW9uO1xuICAgICAgICBpZiAodGFzaylcbiAgICAgICAgICAgIHRhc2suYWJvcnQoKTtcbiAgICAgICAgcnVubmluZyA9IHRydWU7XG4gICAgICAgIGFkZF9yZW5kZXJfY2FsbGJhY2soKCkgPT4gZGlzcGF0Y2gobm9kZSwgdHJ1ZSwgJ3N0YXJ0JykpO1xuICAgICAgICB0YXNrID0gbG9vcChub3cgPT4ge1xuICAgICAgICAgICAgaWYgKHJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobm93ID49IGVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpY2soMSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKG5vZGUsIHRydWUsICdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdCA9IGVhc2luZygobm93IC0gc3RhcnRfdGltZSkgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRpY2sodCwgMSAtIHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBydW5uaW5nO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbGV0IHN0YXJ0ZWQgPSBmYWxzZTtcbiAgICByZXR1cm4ge1xuICAgICAgICBzdGFydCgpIHtcbiAgICAgICAgICAgIGlmIChzdGFydGVkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGRlbGV0ZV9ydWxlKG5vZGUpO1xuICAgICAgICAgICAgaWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcbiAgICAgICAgICAgICAgICBjb25maWcgPSBjb25maWcoKTtcbiAgICAgICAgICAgICAgICB3YWl0KCkudGhlbihnbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBnbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbnZhbGlkYXRlKCkge1xuICAgICAgICAgICAgc3RhcnRlZCA9IGZhbHNlO1xuICAgICAgICB9LFxuICAgICAgICBlbmQoKSB7XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gY3JlYXRlX291dF90cmFuc2l0aW9uKG5vZGUsIGZuLCBwYXJhbXMpIHtcbiAgICBsZXQgY29uZmlnID0gZm4obm9kZSwgcGFyYW1zKTtcbiAgICBsZXQgcnVubmluZyA9IHRydWU7XG4gICAgbGV0IGFuaW1hdGlvbl9uYW1lO1xuICAgIGNvbnN0IGdyb3VwID0gb3V0cm9zO1xuICAgIGdyb3VwLnIgKz0gMTtcbiAgICBmdW5jdGlvbiBnbygpIHtcbiAgICAgICAgY29uc3QgeyBkZWxheSA9IDAsIGR1cmF0aW9uID0gMzAwLCBlYXNpbmcgPSBpZGVudGl0eSwgdGljayA9IG5vb3AsIGNzcyB9ID0gY29uZmlnIHx8IG51bGxfdHJhbnNpdGlvbjtcbiAgICAgICAgaWYgKGNzcylcbiAgICAgICAgICAgIGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUobm9kZSwgMSwgMCwgZHVyYXRpb24sIGRlbGF5LCBlYXNpbmcsIGNzcyk7XG4gICAgICAgIGNvbnN0IHN0YXJ0X3RpbWUgPSBub3coKSArIGRlbGF5O1xuICAgICAgICBjb25zdCBlbmRfdGltZSA9IHN0YXJ0X3RpbWUgKyBkdXJhdGlvbjtcbiAgICAgICAgYWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiBkaXNwYXRjaChub2RlLCBmYWxzZSwgJ3N0YXJ0JykpO1xuICAgICAgICBsb29wKG5vdyA9PiB7XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIGlmIChub3cgPj0gZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGljaygwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2gobm9kZSwgZmFsc2UsICdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEtLWdyb3VwLnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgd2lsbCByZXN1bHQgaW4gYGVuZCgpYCBiZWluZyBjYWxsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzbyB3ZSBkb24ndCBuZWVkIHRvIGNsZWFuIHVwIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bl9hbGwoZ3JvdXAuYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm93ID49IHN0YXJ0X3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdCA9IGVhc2luZygobm93IC0gc3RhcnRfdGltZSkgLyBkdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIHRpY2soMSAtIHQsIHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBydW5uaW5nO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcbiAgICAgICAgd2FpdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnKCk7XG4gICAgICAgICAgICBnbygpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGdvKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGVuZChyZXNldCkge1xuICAgICAgICAgICAgaWYgKHJlc2V0ICYmIGNvbmZpZy50aWNrKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnLnRpY2soMSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIGlmIChhbmltYXRpb25fbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlX3J1bGUobm9kZSwgYW5pbWF0aW9uX25hbWUpO1xuICAgICAgICAgICAgICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5mdW5jdGlvbiBjcmVhdGVfYmlkaXJlY3Rpb25hbF90cmFuc2l0aW9uKG5vZGUsIGZuLCBwYXJhbXMsIGludHJvKSB7XG4gICAgbGV0IGNvbmZpZyA9IGZuKG5vZGUsIHBhcmFtcyk7XG4gICAgbGV0IHQgPSBpbnRybyA/IDAgOiAxO1xuICAgIGxldCBydW5uaW5nX3Byb2dyYW0gPSBudWxsO1xuICAgIGxldCBwZW5kaW5nX3Byb2dyYW0gPSBudWxsO1xuICAgIGxldCBhbmltYXRpb25fbmFtZSA9IG51bGw7XG4gICAgZnVuY3Rpb24gY2xlYXJfYW5pbWF0aW9uKCkge1xuICAgICAgICBpZiAoYW5pbWF0aW9uX25hbWUpXG4gICAgICAgICAgICBkZWxldGVfcnVsZShub2RlLCBhbmltYXRpb25fbmFtZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQocHJvZ3JhbSwgZHVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgZCA9IHByb2dyYW0uYiAtIHQ7XG4gICAgICAgIGR1cmF0aW9uICo9IE1hdGguYWJzKGQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYTogdCxcbiAgICAgICAgICAgIGI6IHByb2dyYW0uYixcbiAgICAgICAgICAgIGQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIHN0YXJ0OiBwcm9ncmFtLnN0YXJ0LFxuICAgICAgICAgICAgZW5kOiBwcm9ncmFtLnN0YXJ0ICsgZHVyYXRpb24sXG4gICAgICAgICAgICBncm91cDogcHJvZ3JhbS5ncm91cFxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnbyhiKSB7XG4gICAgICAgIGNvbnN0IHsgZGVsYXkgPSAwLCBkdXJhdGlvbiA9IDMwMCwgZWFzaW5nID0gaWRlbnRpdHksIHRpY2sgPSBub29wLCBjc3MgfSA9IGNvbmZpZyB8fCBudWxsX3RyYW5zaXRpb247XG4gICAgICAgIGNvbnN0IHByb2dyYW0gPSB7XG4gICAgICAgICAgICBzdGFydDogbm93KCkgKyBkZWxheSxcbiAgICAgICAgICAgIGJcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFiKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIHRvZG86IGltcHJvdmUgdHlwaW5nc1xuICAgICAgICAgICAgcHJvZ3JhbS5ncm91cCA9IG91dHJvcztcbiAgICAgICAgICAgIG91dHJvcy5yICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJ1bm5pbmdfcHJvZ3JhbSkge1xuICAgICAgICAgICAgcGVuZGluZ19wcm9ncmFtID0gcHJvZ3JhbTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYW4gaW50cm8sIGFuZCB0aGVyZSdzIGEgZGVsYXksIHdlIG5lZWQgdG8gZG9cbiAgICAgICAgICAgIC8vIGFuIGluaXRpYWwgdGljayBhbmQvb3IgYXBwbHkgQ1NTIGFuaW1hdGlvbiBpbW1lZGlhdGVseVxuICAgICAgICAgICAgaWYgKGNzcykge1xuICAgICAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbl9uYW1lID0gY3JlYXRlX3J1bGUobm9kZSwgdCwgYiwgZHVyYXRpb24sIGRlbGF5LCBlYXNpbmcsIGNzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYilcbiAgICAgICAgICAgICAgICB0aWNrKDAsIDEpO1xuICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gaW5pdChwcm9ncmFtLCBkdXJhdGlvbik7XG4gICAgICAgICAgICBhZGRfcmVuZGVyX2NhbGxiYWNrKCgpID0+IGRpc3BhdGNoKG5vZGUsIGIsICdzdGFydCcpKTtcbiAgICAgICAgICAgIGxvb3Aobm93ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocGVuZGluZ19wcm9ncmFtICYmIG5vdyA+IHBlbmRpbmdfcHJvZ3JhbS5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICBydW5uaW5nX3Byb2dyYW0gPSBpbml0KHBlbmRpbmdfcHJvZ3JhbSwgZHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nX3Byb2dyYW0gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChub2RlLCBydW5uaW5nX3Byb2dyYW0uYiwgJ3N0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uX25hbWUgPSBjcmVhdGVfcnVsZShub2RlLCB0LCBydW5uaW5nX3Byb2dyYW0uYiwgcnVubmluZ19wcm9ncmFtLmR1cmF0aW9uLCAwLCBlYXNpbmcsIGNvbmZpZy5jc3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChydW5uaW5nX3Byb2dyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vdyA+PSBydW5uaW5nX3Byb2dyYW0uZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrKHQgPSBydW5uaW5nX3Byb2dyYW0uYiwgMSAtIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGF0Y2gobm9kZSwgcnVubmluZ19wcm9ncmFtLmIsICdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcGVuZGluZ19wcm9ncmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UncmUgZG9uZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydW5uaW5nX3Byb2dyYW0uYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnRybyDigJQgd2UgY2FuIHRpZHkgdXAgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJfYW5pbWF0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvdXRybyDigJQgbmVlZHMgdG8gYmUgY29vcmRpbmF0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEtLXJ1bm5pbmdfcHJvZ3JhbS5ncm91cC5yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcnVuX2FsbChydW5uaW5nX3Byb2dyYW0uZ3JvdXAuYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChub3cgPj0gcnVubmluZ19wcm9ncmFtLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwID0gbm93IC0gcnVubmluZ19wcm9ncmFtLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdCA9IHJ1bm5pbmdfcHJvZ3JhbS5hICsgcnVubmluZ19wcm9ncmFtLmQgKiBlYXNpbmcocCAvIHJ1bm5pbmdfcHJvZ3JhbS5kdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrKHQsIDEgLSB0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gISEocnVubmluZ19wcm9ncmFtIHx8IHBlbmRpbmdfcHJvZ3JhbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBydW4oYikge1xuICAgICAgICAgICAgaWYgKGlzX2Z1bmN0aW9uKGNvbmZpZykpIHtcbiAgICAgICAgICAgICAgICB3YWl0KCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnID0gY29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgIGdvKGIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZ28oYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVuZCgpIHtcbiAgICAgICAgICAgIGNsZWFyX2FuaW1hdGlvbigpO1xuICAgICAgICAgICAgcnVubmluZ19wcm9ncmFtID0gcGVuZGluZ19wcm9ncmFtID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhhbmRsZV9wcm9taXNlKHByb21pc2UsIGluZm8pIHtcbiAgICBjb25zdCB0b2tlbiA9IGluZm8udG9rZW4gPSB7fTtcbiAgICBmdW5jdGlvbiB1cGRhdGUodHlwZSwgaW5kZXgsIGtleSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGluZm8udG9rZW4gIT09IHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpbmZvLnJlc29sdmVkID0gdmFsdWU7XG4gICAgICAgIGxldCBjaGlsZF9jdHggPSBpbmZvLmN0eDtcbiAgICAgICAgaWYgKGtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjaGlsZF9jdHggPSBjaGlsZF9jdHguc2xpY2UoKTtcbiAgICAgICAgICAgIGNoaWxkX2N0eFtrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmxvY2sgPSB0eXBlICYmIChpbmZvLmN1cnJlbnQgPSB0eXBlKShjaGlsZF9jdHgpO1xuICAgICAgICBsZXQgbmVlZHNfZmx1c2ggPSBmYWxzZTtcbiAgICAgICAgaWYgKGluZm8uYmxvY2spIHtcbiAgICAgICAgICAgIGlmIChpbmZvLmJsb2Nrcykge1xuICAgICAgICAgICAgICAgIGluZm8uYmxvY2tzLmZvckVhY2goKGJsb2NrLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSBpbmRleCAmJiBibG9jaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdXBfb3V0cm9zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uX291dChibG9jaywgMSwgMSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZm8uYmxvY2tzW2ldID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tfb3V0cm9zKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZm8uYmxvY2suZCgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJsb2NrLmMoKTtcbiAgICAgICAgICAgIHRyYW5zaXRpb25faW4oYmxvY2ssIDEpO1xuICAgICAgICAgICAgYmxvY2subShpbmZvLm1vdW50KCksIGluZm8uYW5jaG9yKTtcbiAgICAgICAgICAgIG5lZWRzX2ZsdXNoID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpbmZvLmJsb2NrID0gYmxvY2s7XG4gICAgICAgIGlmIChpbmZvLmJsb2NrcylcbiAgICAgICAgICAgIGluZm8uYmxvY2tzW2luZGV4XSA9IGJsb2NrO1xuICAgICAgICBpZiAobmVlZHNfZmx1c2gpIHtcbiAgICAgICAgICAgIGZsdXNoKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzX3Byb21pc2UocHJvbWlzZSkpIHtcbiAgICAgICAgY29uc3QgY3VycmVudF9jb21wb25lbnQgPSBnZXRfY3VycmVudF9jb21wb25lbnQoKTtcbiAgICAgICAgcHJvbWlzZS50aGVuKHZhbHVlID0+IHtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjdXJyZW50X2NvbXBvbmVudCk7XG4gICAgICAgICAgICB1cGRhdGUoaW5mby50aGVuLCAxLCBpbmZvLnZhbHVlLCB2YWx1ZSk7XG4gICAgICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQobnVsbCk7XG4gICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjdXJyZW50X2NvbXBvbmVudCk7XG4gICAgICAgICAgICB1cGRhdGUoaW5mby5jYXRjaCwgMiwgaW5mby5lcnJvciwgZXJyb3IpO1xuICAgICAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KG51bGwpO1xuICAgICAgICAgICAgaWYgKCFpbmZvLmhhc0NhdGNoKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBpZiB3ZSBwcmV2aW91c2x5IGhhZCBhIHRoZW4vY2F0Y2ggYmxvY2ssIGRlc3Ryb3kgaXRcbiAgICAgICAgaWYgKGluZm8uY3VycmVudCAhPT0gaW5mby5wZW5kaW5nKSB7XG4gICAgICAgICAgICB1cGRhdGUoaW5mby5wZW5kaW5nLCAwKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoaW5mby5jdXJyZW50ICE9PSBpbmZvLnRoZW4pIHtcbiAgICAgICAgICAgIHVwZGF0ZShpbmZvLnRoZW4sIDEsIGluZm8udmFsdWUsIHByb21pc2UpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5mby5yZXNvbHZlZCA9IHByb21pc2U7XG4gICAgfVxufVxuXG5jb25zdCBnbG9iYWxzID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgPyB3aW5kb3dcbiAgICA6IHR5cGVvZiBnbG9iYWxUaGlzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICA/IGdsb2JhbFRoaXNcbiAgICAgICAgOiBnbG9iYWwpO1xuXG5mdW5jdGlvbiBkZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApIHtcbiAgICBibG9jay5kKDEpO1xuICAgIGxvb2t1cC5kZWxldGUoYmxvY2sua2V5KTtcbn1cbmZ1bmN0aW9uIG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApIHtcbiAgICB0cmFuc2l0aW9uX291dChibG9jaywgMSwgMSwgKCkgPT4ge1xuICAgICAgICBsb29rdXAuZGVsZXRlKGJsb2NrLmtleSk7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBmaXhfYW5kX2Rlc3Ryb3lfYmxvY2soYmxvY2ssIGxvb2t1cCkge1xuICAgIGJsb2NrLmYoKTtcbiAgICBkZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApO1xufVxuZnVuY3Rpb24gZml4X2FuZF9vdXRyb19hbmRfZGVzdHJveV9ibG9jayhibG9jaywgbG9va3VwKSB7XG4gICAgYmxvY2suZigpO1xuICAgIG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrKGJsb2NrLCBsb29rdXApO1xufVxuZnVuY3Rpb24gdXBkYXRlX2tleWVkX2VhY2gob2xkX2Jsb2NrcywgZGlydHksIGdldF9rZXksIGR5bmFtaWMsIGN0eCwgbGlzdCwgbG9va3VwLCBub2RlLCBkZXN0cm95LCBjcmVhdGVfZWFjaF9ibG9jaywgbmV4dCwgZ2V0X2NvbnRleHQpIHtcbiAgICBsZXQgbyA9IG9sZF9ibG9ja3MubGVuZ3RoO1xuICAgIGxldCBuID0gbGlzdC5sZW5ndGg7XG4gICAgbGV0IGkgPSBvO1xuICAgIGNvbnN0IG9sZF9pbmRleGVzID0ge307XG4gICAgd2hpbGUgKGktLSlcbiAgICAgICAgb2xkX2luZGV4ZXNbb2xkX2Jsb2Nrc1tpXS5rZXldID0gaTtcbiAgICBjb25zdCBuZXdfYmxvY2tzID0gW107XG4gICAgY29uc3QgbmV3X2xvb2t1cCA9IG5ldyBNYXAoKTtcbiAgICBjb25zdCBkZWx0YXMgPSBuZXcgTWFwKCk7XG4gICAgaSA9IG47XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBjb25zdCBjaGlsZF9jdHggPSBnZXRfY29udGV4dChjdHgsIGxpc3QsIGkpO1xuICAgICAgICBjb25zdCBrZXkgPSBnZXRfa2V5KGNoaWxkX2N0eCk7XG4gICAgICAgIGxldCBibG9jayA9IGxvb2t1cC5nZXQoa2V5KTtcbiAgICAgICAgaWYgKCFibG9jaykge1xuICAgICAgICAgICAgYmxvY2sgPSBjcmVhdGVfZWFjaF9ibG9jayhrZXksIGNoaWxkX2N0eCk7XG4gICAgICAgICAgICBibG9jay5jKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZHluYW1pYykge1xuICAgICAgICAgICAgYmxvY2sucChjaGlsZF9jdHgsIGRpcnR5KTtcbiAgICAgICAgfVxuICAgICAgICBuZXdfbG9va3VwLnNldChrZXksIG5ld19ibG9ja3NbaV0gPSBibG9jayk7XG4gICAgICAgIGlmIChrZXkgaW4gb2xkX2luZGV4ZXMpXG4gICAgICAgICAgICBkZWx0YXMuc2V0KGtleSwgTWF0aC5hYnMoaSAtIG9sZF9pbmRleGVzW2tleV0pKTtcbiAgICB9XG4gICAgY29uc3Qgd2lsbF9tb3ZlID0gbmV3IFNldCgpO1xuICAgIGNvbnN0IGRpZF9tb3ZlID0gbmV3IFNldCgpO1xuICAgIGZ1bmN0aW9uIGluc2VydChibG9jaykge1xuICAgICAgICB0cmFuc2l0aW9uX2luKGJsb2NrLCAxKTtcbiAgICAgICAgYmxvY2subShub2RlLCBuZXh0KTtcbiAgICAgICAgbG9va3VwLnNldChibG9jay5rZXksIGJsb2NrKTtcbiAgICAgICAgbmV4dCA9IGJsb2NrLmZpcnN0O1xuICAgICAgICBuLS07XG4gICAgfVxuICAgIHdoaWxlIChvICYmIG4pIHtcbiAgICAgICAgY29uc3QgbmV3X2Jsb2NrID0gbmV3X2Jsb2Nrc1tuIC0gMV07XG4gICAgICAgIGNvbnN0IG9sZF9ibG9jayA9IG9sZF9ibG9ja3NbbyAtIDFdO1xuICAgICAgICBjb25zdCBuZXdfa2V5ID0gbmV3X2Jsb2NrLmtleTtcbiAgICAgICAgY29uc3Qgb2xkX2tleSA9IG9sZF9ibG9jay5rZXk7XG4gICAgICAgIGlmIChuZXdfYmxvY2sgPT09IG9sZF9ibG9jaykge1xuICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgbmV4dCA9IG5ld19ibG9jay5maXJzdDtcbiAgICAgICAgICAgIG8tLTtcbiAgICAgICAgICAgIG4tLTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghbmV3X2xvb2t1cC5oYXMob2xkX2tleSkpIHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBvbGQgYmxvY2tcbiAgICAgICAgICAgIGRlc3Ryb3kob2xkX2Jsb2NrLCBsb29rdXApO1xuICAgICAgICAgICAgby0tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFsb29rdXAuaGFzKG5ld19rZXkpIHx8IHdpbGxfbW92ZS5oYXMobmV3X2tleSkpIHtcbiAgICAgICAgICAgIGluc2VydChuZXdfYmxvY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRpZF9tb3ZlLmhhcyhvbGRfa2V5KSkge1xuICAgICAgICAgICAgby0tO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGRlbHRhcy5nZXQobmV3X2tleSkgPiBkZWx0YXMuZ2V0KG9sZF9rZXkpKSB7XG4gICAgICAgICAgICBkaWRfbW92ZS5hZGQobmV3X2tleSk7XG4gICAgICAgICAgICBpbnNlcnQobmV3X2Jsb2NrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHdpbGxfbW92ZS5hZGQob2xkX2tleSk7XG4gICAgICAgICAgICBvLS07XG4gICAgICAgIH1cbiAgICB9XG4gICAgd2hpbGUgKG8tLSkge1xuICAgICAgICBjb25zdCBvbGRfYmxvY2sgPSBvbGRfYmxvY2tzW29dO1xuICAgICAgICBpZiAoIW5ld19sb29rdXAuaGFzKG9sZF9ibG9jay5rZXkpKVxuICAgICAgICAgICAgZGVzdHJveShvbGRfYmxvY2ssIGxvb2t1cCk7XG4gICAgfVxuICAgIHdoaWxlIChuKVxuICAgICAgICBpbnNlcnQobmV3X2Jsb2Nrc1tuIC0gMV0pO1xuICAgIHJldHVybiBuZXdfYmxvY2tzO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVfZWFjaF9rZXlzKGN0eCwgbGlzdCwgZ2V0X2NvbnRleHQsIGdldF9rZXkpIHtcbiAgICBjb25zdCBrZXlzID0gbmV3IFNldCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBrZXkgPSBnZXRfa2V5KGdldF9jb250ZXh0KGN0eCwgbGlzdCwgaSkpO1xuICAgICAgICBpZiAoa2V5cy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaGF2ZSBkdXBsaWNhdGUga2V5cyBpbiBhIGtleWVkIGVhY2hgKTtcbiAgICAgICAgfVxuICAgICAgICBrZXlzLmFkZChrZXkpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0X3NwcmVhZF91cGRhdGUobGV2ZWxzLCB1cGRhdGVzKSB7XG4gICAgY29uc3QgdXBkYXRlID0ge307XG4gICAgY29uc3QgdG9fbnVsbF9vdXQgPSB7fTtcbiAgICBjb25zdCBhY2NvdW50ZWRfZm9yID0geyAkJHNjb3BlOiAxIH07XG4gICAgbGV0IGkgPSBsZXZlbHMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY29uc3QgbyA9IGxldmVsc1tpXTtcbiAgICAgICAgY29uc3QgbiA9IHVwZGF0ZXNbaV07XG4gICAgICAgIGlmIChuKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5IGluIG4pKVxuICAgICAgICAgICAgICAgICAgICB0b19udWxsX291dFtrZXldID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIG4pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFjY291bnRlZF9mb3Jba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVba2V5XSA9IG5ba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudGVkX2ZvcltrZXldID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXZlbHNbaV0gPSBuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbykge1xuICAgICAgICAgICAgICAgIGFjY291bnRlZF9mb3Jba2V5XSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgaW4gdG9fbnVsbF9vdXQpIHtcbiAgICAgICAgaWYgKCEoa2V5IGluIHVwZGF0ZSkpXG4gICAgICAgICAgICB1cGRhdGVba2V5XSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHVwZGF0ZTtcbn1cbmZ1bmN0aW9uIGdldF9zcHJlYWRfb2JqZWN0KHNwcmVhZF9wcm9wcykge1xuICAgIHJldHVybiB0eXBlb2Ygc3ByZWFkX3Byb3BzID09PSAnb2JqZWN0JyAmJiBzcHJlYWRfcHJvcHMgIT09IG51bGwgPyBzcHJlYWRfcHJvcHMgOiB7fTtcbn1cblxuLy8gc291cmNlOiBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmRpY2VzLmh0bWxcbmNvbnN0IGJvb2xlYW5fYXR0cmlidXRlcyA9IG5ldyBTZXQoW1xuICAgICdhbGxvd2Z1bGxzY3JlZW4nLFxuICAgICdhbGxvd3BheW1lbnRyZXF1ZXN0JyxcbiAgICAnYXN5bmMnLFxuICAgICdhdXRvZm9jdXMnLFxuICAgICdhdXRvcGxheScsXG4gICAgJ2NoZWNrZWQnLFxuICAgICdjb250cm9scycsXG4gICAgJ2RlZmF1bHQnLFxuICAgICdkZWZlcicsXG4gICAgJ2Rpc2FibGVkJyxcbiAgICAnZm9ybW5vdmFsaWRhdGUnLFxuICAgICdoaWRkZW4nLFxuICAgICdpc21hcCcsXG4gICAgJ2xvb3AnLFxuICAgICdtdWx0aXBsZScsXG4gICAgJ211dGVkJyxcbiAgICAnbm9tb2R1bGUnLFxuICAgICdub3ZhbGlkYXRlJyxcbiAgICAnb3BlbicsXG4gICAgJ3BsYXlzaW5saW5lJyxcbiAgICAncmVhZG9ubHknLFxuICAgICdyZXF1aXJlZCcsXG4gICAgJ3JldmVyc2VkJyxcbiAgICAnc2VsZWN0ZWQnXG5dKTtcblxuY29uc3QgaW52YWxpZF9hdHRyaWJ1dGVfbmFtZV9jaGFyYWN0ZXIgPSAvW1xccydcIj4vPVxcdXtGREQwfS1cXHV7RkRFRn1cXHV7RkZGRX1cXHV7RkZGRn1cXHV7MUZGRkV9XFx1ezFGRkZGfVxcdXsyRkZGRX1cXHV7MkZGRkZ9XFx1ezNGRkZFfVxcdXszRkZGRn1cXHV7NEZGRkV9XFx1ezRGRkZGfVxcdXs1RkZGRX1cXHV7NUZGRkZ9XFx1ezZGRkZFfVxcdXs2RkZGRn1cXHV7N0ZGRkV9XFx1ezdGRkZGfVxcdXs4RkZGRX1cXHV7OEZGRkZ9XFx1ezlGRkZFfVxcdXs5RkZGRn1cXHV7QUZGRkV9XFx1e0FGRkZGfVxcdXtCRkZGRX1cXHV7QkZGRkZ9XFx1e0NGRkZFfVxcdXtDRkZGRn1cXHV7REZGRkV9XFx1e0RGRkZGfVxcdXtFRkZGRX1cXHV7RUZGRkZ9XFx1e0ZGRkZFfVxcdXtGRkZGRn1cXHV7MTBGRkZFfVxcdXsxMEZGRkZ9XS91O1xuLy8gaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvc3ludGF4Lmh0bWwjYXR0cmlidXRlcy0yXG4vLyBodHRwczovL2luZnJhLnNwZWMud2hhdHdnLm9yZy8jbm9uY2hhcmFjdGVyXG5mdW5jdGlvbiBzcHJlYWQoYXJncywgY2xhc3Nlc190b19hZGQpIHtcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gT2JqZWN0LmFzc2lnbih7fSwgLi4uYXJncyk7XG4gICAgaWYgKGNsYXNzZXNfdG9fYWRkKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLmNsYXNzID09IG51bGwpIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuY2xhc3MgPSBjbGFzc2VzX3RvX2FkZDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMuY2xhc3MgKz0gJyAnICsgY2xhc3Nlc190b19hZGQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IHN0ciA9ICcnO1xuICAgIE9iamVjdC5rZXlzKGF0dHJpYnV0ZXMpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGlmIChpbnZhbGlkX2F0dHJpYnV0ZV9uYW1lX2NoYXJhY3Rlci50ZXN0KG5hbWUpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGF0dHJpYnV0ZXNbbmFtZV07XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdHJ1ZSlcbiAgICAgICAgICAgIHN0ciArPSBcIiBcIiArIG5hbWU7XG4gICAgICAgIGVsc2UgaWYgKGJvb2xlYW5fYXR0cmlidXRlcy5oYXMobmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKVxuICAgICAgICAgICAgICAgIHN0ciArPSBcIiBcIiArIG5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgc3RyICs9IGAgJHtuYW1lfT1cIiR7U3RyaW5nKHZhbHVlKS5yZXBsYWNlKC9cIi9nLCAnJiMzNDsnKS5yZXBsYWNlKC8nL2csICcmIzM5OycpfVwiYDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzdHI7XG59XG5jb25zdCBlc2NhcGVkID0ge1xuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7J1xufTtcbmZ1bmN0aW9uIGVzY2FwZShodG1sKSB7XG4gICAgcmV0dXJuIFN0cmluZyhodG1sKS5yZXBsYWNlKC9bXCInJjw+XS9nLCBtYXRjaCA9PiBlc2NhcGVkW21hdGNoXSk7XG59XG5mdW5jdGlvbiBlYWNoKGl0ZW1zLCBmbikge1xuICAgIGxldCBzdHIgPSAnJztcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIHN0ciArPSBmbihpdGVtc1tpXSwgaSk7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5jb25zdCBtaXNzaW5nX2NvbXBvbmVudCA9IHtcbiAgICAkJHJlbmRlcjogKCkgPT4gJydcbn07XG5mdW5jdGlvbiB2YWxpZGF0ZV9jb21wb25lbnQoY29tcG9uZW50LCBuYW1lKSB7XG4gICAgaWYgKCFjb21wb25lbnQgfHwgIWNvbXBvbmVudC4kJHJlbmRlcikge1xuICAgICAgICBpZiAobmFtZSA9PT0gJ3N2ZWx0ZTpjb21wb25lbnQnKVxuICAgICAgICAgICAgbmFtZSArPSAnIHRoaXM9ey4uLn0nO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYDwke25hbWV9PiBpcyBub3QgYSB2YWxpZCBTU1IgY29tcG9uZW50LiBZb3UgbWF5IG5lZWQgdG8gcmV2aWV3IHlvdXIgYnVpbGQgY29uZmlnIHRvIGVuc3VyZSB0aGF0IGRlcGVuZGVuY2llcyBhcmUgY29tcGlsZWQsIHJhdGhlciB0aGFuIGltcG9ydGVkIGFzIHByZS1jb21waWxlZCBtb2R1bGVzYCk7XG4gICAgfVxuICAgIHJldHVybiBjb21wb25lbnQ7XG59XG5mdW5jdGlvbiBkZWJ1ZyhmaWxlLCBsaW5lLCBjb2x1bW4sIHZhbHVlcykge1xuICAgIGNvbnNvbGUubG9nKGB7QGRlYnVnfSAke2ZpbGUgPyBmaWxlICsgJyAnIDogJyd9KCR7bGluZX06JHtjb2x1bW59KWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyh2YWx1ZXMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICByZXR1cm4gJyc7XG59XG5sZXQgb25fZGVzdHJveTtcbmZ1bmN0aW9uIGNyZWF0ZV9zc3JfY29tcG9uZW50KGZuKSB7XG4gICAgZnVuY3Rpb24gJCRyZW5kZXIocmVzdWx0LCBwcm9wcywgYmluZGluZ3MsIHNsb3RzKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudF9jb21wb25lbnQgPSBjdXJyZW50X2NvbXBvbmVudDtcbiAgICAgICAgY29uc3QgJCQgPSB7XG4gICAgICAgICAgICBvbl9kZXN0cm95LFxuICAgICAgICAgICAgY29udGV4dDogbmV3IE1hcChwYXJlbnRfY29tcG9uZW50ID8gcGFyZW50X2NvbXBvbmVudC4kJC5jb250ZXh0IDogW10pLFxuICAgICAgICAgICAgLy8gdGhlc2Ugd2lsbCBiZSBpbW1lZGlhdGVseSBkaXNjYXJkZWRcbiAgICAgICAgICAgIG9uX21vdW50OiBbXSxcbiAgICAgICAgICAgIGJlZm9yZV91cGRhdGU6IFtdLFxuICAgICAgICAgICAgYWZ0ZXJfdXBkYXRlOiBbXSxcbiAgICAgICAgICAgIGNhbGxiYWNrczogYmxhbmtfb2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgc2V0X2N1cnJlbnRfY29tcG9uZW50KHsgJCQgfSk7XG4gICAgICAgIGNvbnN0IGh0bWwgPSBmbihyZXN1bHQsIHByb3BzLCBiaW5kaW5ncywgc2xvdHMpO1xuICAgICAgICBzZXRfY3VycmVudF9jb21wb25lbnQocGFyZW50X2NvbXBvbmVudCk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICByZW5kZXI6IChwcm9wcyA9IHt9LCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgICAgIG9uX2Rlc3Ryb3kgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHsgdGl0bGU6ICcnLCBoZWFkOiAnJywgY3NzOiBuZXcgU2V0KCkgfTtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSAkJHJlbmRlcihyZXN1bHQsIHByb3BzLCB7fSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBydW5fYWxsKG9uX2Rlc3Ryb3kpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBodG1sLFxuICAgICAgICAgICAgICAgIGNzczoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBBcnJheS5mcm9tKHJlc3VsdC5jc3MpLm1hcChjc3MgPT4gY3NzLmNvZGUpLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgICAgICAgICBtYXA6IG51bGwgLy8gVE9ET1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaGVhZDogcmVzdWx0LnRpdGxlICsgcmVzdWx0LmhlYWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgICQkcmVuZGVyXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGFkZF9hdHRyaWJ1dGUobmFtZSwgdmFsdWUsIGJvb2xlYW4pIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCAoYm9vbGVhbiAmJiAhdmFsdWUpKVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgcmV0dXJuIGAgJHtuYW1lfSR7dmFsdWUgPT09IHRydWUgPyAnJyA6IGA9JHt0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gSlNPTi5zdHJpbmdpZnkoZXNjYXBlKHZhbHVlKSkgOiBgXCIke3ZhbHVlfVwiYH1gfWA7XG59XG5mdW5jdGlvbiBhZGRfY2xhc3NlcyhjbGFzc2VzKSB7XG4gICAgcmV0dXJuIGNsYXNzZXMgPyBgIGNsYXNzPVwiJHtjbGFzc2VzfVwiYCA6IGBgO1xufVxuXG5mdW5jdGlvbiBiaW5kKGNvbXBvbmVudCwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBpbmRleCA9IGNvbXBvbmVudC4kJC5wcm9wc1tuYW1lXTtcbiAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb21wb25lbnQuJCQuYm91bmRbaW5kZXhdID0gY2FsbGJhY2s7XG4gICAgICAgIGNhbGxiYWNrKGNvbXBvbmVudC4kJC5jdHhbaW5kZXhdKTtcbiAgICB9XG59XG5mdW5jdGlvbiBjcmVhdGVfY29tcG9uZW50KGJsb2NrKSB7XG4gICAgYmxvY2sgJiYgYmxvY2suYygpO1xufVxuZnVuY3Rpb24gY2xhaW1fY29tcG9uZW50KGJsb2NrLCBwYXJlbnRfbm9kZXMpIHtcbiAgICBibG9jayAmJiBibG9jay5sKHBhcmVudF9ub2Rlcyk7XG59XG5mdW5jdGlvbiBtb3VudF9jb21wb25lbnQoY29tcG9uZW50LCB0YXJnZXQsIGFuY2hvcikge1xuICAgIGNvbnN0IHsgZnJhZ21lbnQsIG9uX21vdW50LCBvbl9kZXN0cm95LCBhZnRlcl91cGRhdGUgfSA9IGNvbXBvbmVudC4kJDtcbiAgICBmcmFnbWVudCAmJiBmcmFnbWVudC5tKHRhcmdldCwgYW5jaG9yKTtcbiAgICAvLyBvbk1vdW50IGhhcHBlbnMgYmVmb3JlIHRoZSBpbml0aWFsIGFmdGVyVXBkYXRlXG4gICAgYWRkX3JlbmRlcl9jYWxsYmFjaygoKSA9PiB7XG4gICAgICAgIGNvbnN0IG5ld19vbl9kZXN0cm95ID0gb25fbW91bnQubWFwKHJ1bikuZmlsdGVyKGlzX2Z1bmN0aW9uKTtcbiAgICAgICAgaWYgKG9uX2Rlc3Ryb3kpIHtcbiAgICAgICAgICAgIG9uX2Rlc3Ryb3kucHVzaCguLi5uZXdfb25fZGVzdHJveSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBFZGdlIGNhc2UgLSBjb21wb25lbnQgd2FzIGRlc3Ryb3llZCBpbW1lZGlhdGVseSxcbiAgICAgICAgICAgIC8vIG1vc3QgbGlrZWx5IGFzIGEgcmVzdWx0IG9mIGEgYmluZGluZyBpbml0aWFsaXNpbmdcbiAgICAgICAgICAgIHJ1bl9hbGwobmV3X29uX2Rlc3Ryb3kpO1xuICAgICAgICB9XG4gICAgICAgIGNvbXBvbmVudC4kJC5vbl9tb3VudCA9IFtdO1xuICAgIH0pO1xuICAgIGFmdGVyX3VwZGF0ZS5mb3JFYWNoKGFkZF9yZW5kZXJfY2FsbGJhY2spO1xufVxuZnVuY3Rpb24gZGVzdHJveV9jb21wb25lbnQoY29tcG9uZW50LCBkZXRhY2hpbmcpIHtcbiAgICBjb25zdCAkJCA9IGNvbXBvbmVudC4kJDtcbiAgICBpZiAoJCQuZnJhZ21lbnQgIT09IG51bGwpIHtcbiAgICAgICAgcnVuX2FsbCgkJC5vbl9kZXN0cm95KTtcbiAgICAgICAgJCQuZnJhZ21lbnQgJiYgJCQuZnJhZ21lbnQuZChkZXRhY2hpbmcpO1xuICAgICAgICAvLyBUT0RPIG51bGwgb3V0IG90aGVyIHJlZnMsIGluY2x1ZGluZyBjb21wb25lbnQuJCQgKGJ1dCBuZWVkIHRvXG4gICAgICAgIC8vIHByZXNlcnZlIGZpbmFsIHN0YXRlPylcbiAgICAgICAgJCQub25fZGVzdHJveSA9ICQkLmZyYWdtZW50ID0gbnVsbDtcbiAgICAgICAgJCQuY3R4ID0gW107XG4gICAgfVxufVxuZnVuY3Rpb24gbWFrZV9kaXJ0eShjb21wb25lbnQsIGkpIHtcbiAgICBpZiAoY29tcG9uZW50LiQkLmRpcnR5WzBdID09PSAtMSkge1xuICAgICAgICBkaXJ0eV9jb21wb25lbnRzLnB1c2goY29tcG9uZW50KTtcbiAgICAgICAgc2NoZWR1bGVfdXBkYXRlKCk7XG4gICAgICAgIGNvbXBvbmVudC4kJC5kaXJ0eS5maWxsKDApO1xuICAgIH1cbiAgICBjb21wb25lbnQuJCQuZGlydHlbKGkgLyAzMSkgfCAwXSB8PSAoMSA8PCAoaSAlIDMxKSk7XG59XG5mdW5jdGlvbiBpbml0KGNvbXBvbmVudCwgb3B0aW9ucywgaW5zdGFuY2UsIGNyZWF0ZV9mcmFnbWVudCwgbm90X2VxdWFsLCBwcm9wcywgZGlydHkgPSBbLTFdKSB7XG4gICAgY29uc3QgcGFyZW50X2NvbXBvbmVudCA9IGN1cnJlbnRfY29tcG9uZW50O1xuICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChjb21wb25lbnQpO1xuICAgIGNvbnN0IHByb3BfdmFsdWVzID0gb3B0aW9ucy5wcm9wcyB8fCB7fTtcbiAgICBjb25zdCAkJCA9IGNvbXBvbmVudC4kJCA9IHtcbiAgICAgICAgZnJhZ21lbnQ6IG51bGwsXG4gICAgICAgIGN0eDogbnVsbCxcbiAgICAgICAgLy8gc3RhdGVcbiAgICAgICAgcHJvcHMsXG4gICAgICAgIHVwZGF0ZTogbm9vcCxcbiAgICAgICAgbm90X2VxdWFsLFxuICAgICAgICBib3VuZDogYmxhbmtfb2JqZWN0KCksXG4gICAgICAgIC8vIGxpZmVjeWNsZVxuICAgICAgICBvbl9tb3VudDogW10sXG4gICAgICAgIG9uX2Rlc3Ryb3k6IFtdLFxuICAgICAgICBiZWZvcmVfdXBkYXRlOiBbXSxcbiAgICAgICAgYWZ0ZXJfdXBkYXRlOiBbXSxcbiAgICAgICAgY29udGV4dDogbmV3IE1hcChwYXJlbnRfY29tcG9uZW50ID8gcGFyZW50X2NvbXBvbmVudC4kJC5jb250ZXh0IDogW10pLFxuICAgICAgICAvLyBldmVyeXRoaW5nIGVsc2VcbiAgICAgICAgY2FsbGJhY2tzOiBibGFua19vYmplY3QoKSxcbiAgICAgICAgZGlydHksXG4gICAgICAgIHNraXBfYm91bmQ6IGZhbHNlXG4gICAgfTtcbiAgICBsZXQgcmVhZHkgPSBmYWxzZTtcbiAgICAkJC5jdHggPSBpbnN0YW5jZVxuICAgICAgICA/IGluc3RhbmNlKGNvbXBvbmVudCwgcHJvcF92YWx1ZXMsIChpLCByZXQsIC4uLnJlc3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcmVzdC5sZW5ndGggPyByZXN0WzBdIDogcmV0O1xuICAgICAgICAgICAgaWYgKCQkLmN0eCAmJiBub3RfZXF1YWwoJCQuY3R4W2ldLCAkJC5jdHhbaV0gPSB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoISQkLnNraXBfYm91bmQgJiYgJCQuYm91bmRbaV0pXG4gICAgICAgICAgICAgICAgICAgICQkLmJvdW5kW2ldKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVhZHkpXG4gICAgICAgICAgICAgICAgICAgIG1ha2VfZGlydHkoY29tcG9uZW50LCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0pXG4gICAgICAgIDogW107XG4gICAgJCQudXBkYXRlKCk7XG4gICAgcmVhZHkgPSB0cnVlO1xuICAgIHJ1bl9hbGwoJCQuYmVmb3JlX3VwZGF0ZSk7XG4gICAgLy8gYGZhbHNlYCBhcyBhIHNwZWNpYWwgY2FzZSBvZiBubyBET00gY29tcG9uZW50XG4gICAgJCQuZnJhZ21lbnQgPSBjcmVhdGVfZnJhZ21lbnQgPyBjcmVhdGVfZnJhZ21lbnQoJCQuY3R4KSA6IGZhbHNlO1xuICAgIGlmIChvcHRpb25zLnRhcmdldCkge1xuICAgICAgICBpZiAob3B0aW9ucy5oeWRyYXRlKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlcyA9IGNoaWxkcmVuKG9wdGlvbnMudGFyZ2V0KTtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5sKG5vZGVzKTtcbiAgICAgICAgICAgIG5vZGVzLmZvckVhY2goZGV0YWNoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAkJC5mcmFnbWVudCAmJiAkJC5mcmFnbWVudC5jKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuaW50cm8pXG4gICAgICAgICAgICB0cmFuc2l0aW9uX2luKGNvbXBvbmVudC4kJC5mcmFnbWVudCk7XG4gICAgICAgIG1vdW50X2NvbXBvbmVudChjb21wb25lbnQsIG9wdGlvbnMudGFyZ2V0LCBvcHRpb25zLmFuY2hvcik7XG4gICAgICAgIGZsdXNoKCk7XG4gICAgfVxuICAgIHNldF9jdXJyZW50X2NvbXBvbmVudChwYXJlbnRfY29tcG9uZW50KTtcbn1cbmxldCBTdmVsdGVFbGVtZW50O1xuaWYgKHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIFN2ZWx0ZUVsZW1lbnQgPSBjbGFzcyBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBzdXBlcigpO1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIHRvZG86IGltcHJvdmUgdHlwaW5nc1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy4kJC5zbG90dGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSB0b2RvOiBpbXByb3ZlIHR5cGluZ3NcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKHRoaXMuJCQuc2xvdHRlZFtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2soYXR0ciwgX29sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICAgICAgdGhpc1thdHRyXSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG4gICAgICAgICRkZXN0cm95KCkge1xuICAgICAgICAgICAgZGVzdHJveV9jb21wb25lbnQodGhpcywgMSk7XG4gICAgICAgICAgICB0aGlzLiRkZXN0cm95ID0gbm9vcDtcbiAgICAgICAgfVxuICAgICAgICAkb24odHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIFRPRE8gc2hvdWxkIHRoaXMgZGVsZWdhdGUgdG8gYWRkRXZlbnRMaXN0ZW5lcj9cbiAgICAgICAgICAgIGNvbnN0IGNhbGxiYWNrcyA9ICh0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSB8fCAodGhpcy4kJC5jYWxsYmFja3NbdHlwZV0gPSBbXSkpO1xuICAgICAgICAgICAgY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IGNhbGxiYWNrcy5pbmRleE9mKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgJHNldCgkJHByb3BzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy4kJHNldCAmJiAhaXNfZW1wdHkoJCRwcm9wcykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiQkLnNraXBfYm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuJCRzZXQoJCRwcm9wcyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kJC5za2lwX2JvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuY2xhc3MgU3ZlbHRlQ29tcG9uZW50IHtcbiAgICAkZGVzdHJveSgpIHtcbiAgICAgICAgZGVzdHJveV9jb21wb25lbnQodGhpcywgMSk7XG4gICAgICAgIHRoaXMuJGRlc3Ryb3kgPSBub29wO1xuICAgIH1cbiAgICAkb24odHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gKHRoaXMuJCQuY2FsbGJhY2tzW3R5cGVdIHx8ICh0aGlzLiQkLmNhbGxiYWNrc1t0eXBlXSA9IFtdKSk7XG4gICAgICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gY2FsbGJhY2tzLmluZGV4T2YoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSlcbiAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgJHNldCgkJHByb3BzKSB7XG4gICAgICAgIGlmICh0aGlzLiQkc2V0ICYmICFpc19lbXB0eSgkJHByb3BzKSkge1xuICAgICAgICAgICAgdGhpcy4kJC5za2lwX2JvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuJCRzZXQoJCRwcm9wcyk7XG4gICAgICAgICAgICB0aGlzLiQkLnNraXBfYm91bmQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hfZGV2KHR5cGUsIGRldGFpbCkge1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQoY3VzdG9tX2V2ZW50KHR5cGUsIE9iamVjdC5hc3NpZ24oeyB2ZXJzaW9uOiAnMy4yNy4wJyB9LCBkZXRhaWwpKSk7XG59XG5mdW5jdGlvbiBhcHBlbmRfZGV2KHRhcmdldCwgbm9kZSkge1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTUluc2VydFwiLCB7IHRhcmdldCwgbm9kZSB9KTtcbiAgICBhcHBlbmQodGFyZ2V0LCBub2RlKTtcbn1cbmZ1bmN0aW9uIGluc2VydF9kZXYodGFyZ2V0LCBub2RlLCBhbmNob3IpIHtcbiAgICBkaXNwYXRjaF9kZXYoXCJTdmVsdGVET01JbnNlcnRcIiwgeyB0YXJnZXQsIG5vZGUsIGFuY2hvciB9KTtcbiAgICBpbnNlcnQodGFyZ2V0LCBub2RlLCBhbmNob3IpO1xufVxuZnVuY3Rpb24gZGV0YWNoX2Rldihub2RlKSB7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NUmVtb3ZlXCIsIHsgbm9kZSB9KTtcbiAgICBkZXRhY2gobm9kZSk7XG59XG5mdW5jdGlvbiBkZXRhY2hfYmV0d2Vlbl9kZXYoYmVmb3JlLCBhZnRlcikge1xuICAgIHdoaWxlIChiZWZvcmUubmV4dFNpYmxpbmcgJiYgYmVmb3JlLm5leHRTaWJsaW5nICE9PSBhZnRlcikge1xuICAgICAgICBkZXRhY2hfZGV2KGJlZm9yZS5uZXh0U2libGluZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gZGV0YWNoX2JlZm9yZV9kZXYoYWZ0ZXIpIHtcbiAgICB3aGlsZSAoYWZ0ZXIucHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgIGRldGFjaF9kZXYoYWZ0ZXIucHJldmlvdXNTaWJsaW5nKTtcbiAgICB9XG59XG5mdW5jdGlvbiBkZXRhY2hfYWZ0ZXJfZGV2KGJlZm9yZSkge1xuICAgIHdoaWxlIChiZWZvcmUubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgZGV0YWNoX2RldihiZWZvcmUubmV4dFNpYmxpbmcpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGxpc3Rlbl9kZXYobm9kZSwgZXZlbnQsIGhhbmRsZXIsIG9wdGlvbnMsIGhhc19wcmV2ZW50X2RlZmF1bHQsIGhhc19zdG9wX3Byb3BhZ2F0aW9uKSB7XG4gICAgY29uc3QgbW9kaWZpZXJzID0gb3B0aW9ucyA9PT0gdHJ1ZSA/IFtcImNhcHR1cmVcIl0gOiBvcHRpb25zID8gQXJyYXkuZnJvbShPYmplY3Qua2V5cyhvcHRpb25zKSkgOiBbXTtcbiAgICBpZiAoaGFzX3ByZXZlbnRfZGVmYXVsdClcbiAgICAgICAgbW9kaWZpZXJzLnB1c2goJ3ByZXZlbnREZWZhdWx0Jyk7XG4gICAgaWYgKGhhc19zdG9wX3Byb3BhZ2F0aW9uKVxuICAgICAgICBtb2RpZmllcnMucHVzaCgnc3RvcFByb3BhZ2F0aW9uJyk7XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NQWRkRXZlbnRMaXN0ZW5lclwiLCB7IG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBtb2RpZmllcnMgfSk7XG4gICAgY29uc3QgZGlzcG9zZSA9IGxpc3Rlbihub2RlLCBldmVudCwgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NUmVtb3ZlRXZlbnRMaXN0ZW5lclwiLCB7IG5vZGUsIGV2ZW50LCBoYW5kbGVyLCBtb2RpZmllcnMgfSk7XG4gICAgICAgIGRpc3Bvc2UoKTtcbiAgICB9O1xufVxuZnVuY3Rpb24gYXR0cl9kZXYobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSkge1xuICAgIGF0dHIobm9kZSwgYXR0cmlidXRlLCB2YWx1ZSk7XG4gICAgaWYgKHZhbHVlID09IG51bGwpXG4gICAgICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVJlbW92ZUF0dHJpYnV0ZVwiLCB7IG5vZGUsIGF0dHJpYnV0ZSB9KTtcbiAgICBlbHNlXG4gICAgICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldEF0dHJpYnV0ZVwiLCB7IG5vZGUsIGF0dHJpYnV0ZSwgdmFsdWUgfSk7XG59XG5mdW5jdGlvbiBwcm9wX2Rldihub2RlLCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICBub2RlW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldFByb3BlcnR5XCIsIHsgbm9kZSwgcHJvcGVydHksIHZhbHVlIH0pO1xufVxuZnVuY3Rpb24gZGF0YXNldF9kZXYobm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XG4gICAgbm9kZS5kYXRhc2V0W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgIGRpc3BhdGNoX2RldihcIlN2ZWx0ZURPTVNldERhdGFzZXRcIiwgeyBub2RlLCBwcm9wZXJ0eSwgdmFsdWUgfSk7XG59XG5mdW5jdGlvbiBzZXRfZGF0YV9kZXYodGV4dCwgZGF0YSkge1xuICAgIGRhdGEgPSAnJyArIGRhdGE7XG4gICAgaWYgKHRleHQud2hvbGVUZXh0ID09PSBkYXRhKVxuICAgICAgICByZXR1cm47XG4gICAgZGlzcGF0Y2hfZGV2KFwiU3ZlbHRlRE9NU2V0RGF0YVwiLCB7IG5vZGU6IHRleHQsIGRhdGEgfSk7XG4gICAgdGV4dC5kYXRhID0gZGF0YTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlX2VhY2hfYXJndW1lbnQoYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdzdHJpbmcnICYmICEoYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmICdsZW5ndGgnIGluIGFyZykpIHtcbiAgICAgICAgbGV0IG1zZyA9ICd7I2VhY2h9IG9ubHkgaXRlcmF0ZXMgb3ZlciBhcnJheS1saWtlIG9iamVjdHMuJztcbiAgICAgICAgaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgYXJnICYmIFN5bWJvbC5pdGVyYXRvciBpbiBhcmcpIHtcbiAgICAgICAgICAgIG1zZyArPSAnIFlvdSBjYW4gdXNlIGEgc3ByZWFkIHRvIGNvbnZlcnQgdGhpcyBpdGVyYWJsZSBpbnRvIGFuIGFycmF5Lic7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxufVxuZnVuY3Rpb24gdmFsaWRhdGVfc2xvdHMobmFtZSwgc2xvdCwga2V5cykge1xuICAgIGZvciAoY29uc3Qgc2xvdF9rZXkgb2YgT2JqZWN0LmtleXMoc2xvdCkpIHtcbiAgICAgICAgaWYgKCF+a2V5cy5pbmRleE9mKHNsb3Rfa2V5KSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGA8JHtuYW1lfT4gcmVjZWl2ZWQgYW4gdW5leHBlY3RlZCBzbG90IFwiJHtzbG90X2tleX1cIi5gKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmNsYXNzIFN2ZWx0ZUNvbXBvbmVudERldiBleHRlbmRzIFN2ZWx0ZUNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMgfHwgKCFvcHRpb25zLnRhcmdldCAmJiAhb3B0aW9ucy4kJGlubGluZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJ3RhcmdldCcgaXMgYSByZXF1aXJlZCBvcHRpb25gKTtcbiAgICAgICAgfVxuICAgICAgICBzdXBlcigpO1xuICAgIH1cbiAgICAkZGVzdHJveSgpIHtcbiAgICAgICAgc3VwZXIuJGRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy4kZGVzdHJveSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ29tcG9uZW50IHdhcyBhbHJlYWR5IGRlc3Ryb3llZGApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgfTtcbiAgICB9XG4gICAgJGNhcHR1cmVfc3RhdGUoKSB7IH1cbiAgICAkaW5qZWN0X3N0YXRlKCkgeyB9XG59XG5mdW5jdGlvbiBsb29wX2d1YXJkKHRpbWVvdXQpIHtcbiAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgaWYgKERhdGUubm93KCkgLSBzdGFydCA+IHRpbWVvdXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5maW5pdGUgbG9vcCBkZXRlY3RlZGApO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZXhwb3J0IHsgSHRtbFRhZywgU3ZlbHRlQ29tcG9uZW50LCBTdmVsdGVDb21wb25lbnREZXYsIFN2ZWx0ZUVsZW1lbnQsIGFjdGlvbl9kZXN0cm95ZXIsIGFkZF9hdHRyaWJ1dGUsIGFkZF9jbGFzc2VzLCBhZGRfZmx1c2hfY2FsbGJhY2ssIGFkZF9sb2NhdGlvbiwgYWRkX3JlbmRlcl9jYWxsYmFjaywgYWRkX3Jlc2l6ZV9saXN0ZW5lciwgYWRkX3RyYW5zZm9ybSwgYWZ0ZXJVcGRhdGUsIGFwcGVuZCwgYXBwZW5kX2RldiwgYXNzaWduLCBhdHRyLCBhdHRyX2RldiwgYmVmb3JlVXBkYXRlLCBiaW5kLCBiaW5kaW5nX2NhbGxiYWNrcywgYmxhbmtfb2JqZWN0LCBidWJibGUsIGNoZWNrX291dHJvcywgY2hpbGRyZW4sIGNsYWltX2NvbXBvbmVudCwgY2xhaW1fZWxlbWVudCwgY2xhaW1fc3BhY2UsIGNsYWltX3RleHQsIGNsZWFyX2xvb3BzLCBjb21wb25lbnRfc3Vic2NyaWJlLCBjb21wdXRlX3Jlc3RfcHJvcHMsIGNvbXB1dGVfc2xvdHMsIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlciwgY3JlYXRlX2FuaW1hdGlvbiwgY3JlYXRlX2JpZGlyZWN0aW9uYWxfdHJhbnNpdGlvbiwgY3JlYXRlX2NvbXBvbmVudCwgY3JlYXRlX2luX3RyYW5zaXRpb24sIGNyZWF0ZV9vdXRfdHJhbnNpdGlvbiwgY3JlYXRlX3Nsb3QsIGNyZWF0ZV9zc3JfY29tcG9uZW50LCBjdXJyZW50X2NvbXBvbmVudCwgY3VzdG9tX2V2ZW50LCBkYXRhc2V0X2RldiwgZGVidWcsIGRlc3Ryb3lfYmxvY2ssIGRlc3Ryb3lfY29tcG9uZW50LCBkZXN0cm95X2VhY2gsIGRldGFjaCwgZGV0YWNoX2FmdGVyX2RldiwgZGV0YWNoX2JlZm9yZV9kZXYsIGRldGFjaF9iZXR3ZWVuX2RldiwgZGV0YWNoX2RldiwgZGlydHlfY29tcG9uZW50cywgZGlzcGF0Y2hfZGV2LCBlYWNoLCBlbGVtZW50LCBlbGVtZW50X2lzLCBlbXB0eSwgZXNjYXBlLCBlc2NhcGVkLCBleGNsdWRlX2ludGVybmFsX3Byb3BzLCBmaXhfYW5kX2Rlc3Ryb3lfYmxvY2ssIGZpeF9hbmRfb3V0cm9fYW5kX2Rlc3Ryb3lfYmxvY2ssIGZpeF9wb3NpdGlvbiwgZmx1c2gsIGdldENvbnRleHQsIGdldF9iaW5kaW5nX2dyb3VwX3ZhbHVlLCBnZXRfY3VycmVudF9jb21wb25lbnQsIGdldF9zbG90X2NoYW5nZXMsIGdldF9zbG90X2NvbnRleHQsIGdldF9zcHJlYWRfb2JqZWN0LCBnZXRfc3ByZWFkX3VwZGF0ZSwgZ2V0X3N0b3JlX3ZhbHVlLCBnbG9iYWxzLCBncm91cF9vdXRyb3MsIGhhbmRsZV9wcm9taXNlLCBoYXNfcHJvcCwgaWRlbnRpdHksIGluaXQsIGluc2VydCwgaW5zZXJ0X2RldiwgaW50cm9zLCBpbnZhbGlkX2F0dHJpYnV0ZV9uYW1lX2NoYXJhY3RlciwgaXNfY2xpZW50LCBpc19jcm9zc29yaWdpbiwgaXNfZW1wdHksIGlzX2Z1bmN0aW9uLCBpc19wcm9taXNlLCBsaXN0ZW4sIGxpc3Rlbl9kZXYsIGxvb3AsIGxvb3BfZ3VhcmQsIG1pc3NpbmdfY29tcG9uZW50LCBtb3VudF9jb21wb25lbnQsIG5vb3AsIG5vdF9lcXVhbCwgbm93LCBudWxsX3RvX2VtcHR5LCBvYmplY3Rfd2l0aG91dF9wcm9wZXJ0aWVzLCBvbkRlc3Ryb3ksIG9uTW91bnQsIG9uY2UsIG91dHJvX2FuZF9kZXN0cm95X2Jsb2NrLCBwcmV2ZW50X2RlZmF1bHQsIHByb3BfZGV2LCBxdWVyeV9zZWxlY3Rvcl9hbGwsIHJhZiwgcnVuLCBydW5fYWxsLCBzYWZlX25vdF9lcXVhbCwgc2NoZWR1bGVfdXBkYXRlLCBzZWxlY3RfbXVsdGlwbGVfdmFsdWUsIHNlbGVjdF9vcHRpb24sIHNlbGVjdF9vcHRpb25zLCBzZWxlY3RfdmFsdWUsIHNlbGYsIHNldENvbnRleHQsIHNldF9hdHRyaWJ1dGVzLCBzZXRfY3VycmVudF9jb21wb25lbnQsIHNldF9jdXN0b21fZWxlbWVudF9kYXRhLCBzZXRfZGF0YSwgc2V0X2RhdGFfZGV2LCBzZXRfaW5wdXRfdHlwZSwgc2V0X2lucHV0X3ZhbHVlLCBzZXRfbm93LCBzZXRfcmFmLCBzZXRfc3RvcmVfdmFsdWUsIHNldF9zdHlsZSwgc2V0X3N2Z19hdHRyaWJ1dGVzLCBzcGFjZSwgc3ByZWFkLCBzdG9wX3Byb3BhZ2F0aW9uLCBzdWJzY3JpYmUsIHN2Z19lbGVtZW50LCB0ZXh0LCB0aWNrLCB0aW1lX3Jhbmdlc190b19hcnJheSwgdG9fbnVtYmVyLCB0b2dnbGVfY2xhc3MsIHRyYW5zaXRpb25faW4sIHRyYW5zaXRpb25fb3V0LCB1cGRhdGVfa2V5ZWRfZWFjaCwgdXBkYXRlX3Nsb3QsIHZhbGlkYXRlX2NvbXBvbmVudCwgdmFsaWRhdGVfZWFjaF9hcmd1bWVudCwgdmFsaWRhdGVfZWFjaF9rZXlzLCB2YWxpZGF0ZV9zbG90cywgdmFsaWRhdGVfc3RvcmUsIHhsaW5rX2F0dHIgfTtcbiIsImltcG9ydCB7IG5vb3AsIHNhZmVfbm90X2VxdWFsLCBzdWJzY3JpYmUsIHJ1bl9hbGwsIGlzX2Z1bmN0aW9uIH0gZnJvbSAnLi4vaW50ZXJuYWwnO1xuZXhwb3J0IHsgZ2V0X3N0b3JlX3ZhbHVlIGFzIGdldCB9IGZyb20gJy4uL2ludGVybmFsJztcblxuY29uc3Qgc3Vic2NyaWJlcl9xdWV1ZSA9IFtdO1xuLyoqXG4gKiBDcmVhdGVzIGEgYFJlYWRhYmxlYCBzdG9yZSB0aGF0IGFsbG93cyByZWFkaW5nIGJ5IHN1YnNjcmlwdGlvbi5cbiAqIEBwYXJhbSB2YWx1ZSBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge1N0YXJ0U3RvcE5vdGlmaWVyfXN0YXJ0IHN0YXJ0IGFuZCBzdG9wIG5vdGlmaWNhdGlvbnMgZm9yIHN1YnNjcmlwdGlvbnNcbiAqL1xuZnVuY3Rpb24gcmVhZGFibGUodmFsdWUsIHN0YXJ0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3Vic2NyaWJlOiB3cml0YWJsZSh2YWx1ZSwgc3RhcnQpLnN1YnNjcmliZVxuICAgIH07XG59XG4vKipcbiAqIENyZWF0ZSBhIGBXcml0YWJsZWAgc3RvcmUgdGhhdCBhbGxvd3MgYm90aCB1cGRhdGluZyBhbmQgcmVhZGluZyBieSBzdWJzY3JpcHRpb24uXG4gKiBAcGFyYW0geyo9fXZhbHVlIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7U3RhcnRTdG9wTm90aWZpZXI9fXN0YXJ0IHN0YXJ0IGFuZCBzdG9wIG5vdGlmaWNhdGlvbnMgZm9yIHN1YnNjcmlwdGlvbnNcbiAqL1xuZnVuY3Rpb24gd3JpdGFibGUodmFsdWUsIHN0YXJ0ID0gbm9vcCkge1xuICAgIGxldCBzdG9wO1xuICAgIGNvbnN0IHN1YnNjcmliZXJzID0gW107XG4gICAgZnVuY3Rpb24gc2V0KG5ld192YWx1ZSkge1xuICAgICAgICBpZiAoc2FmZV9ub3RfZXF1YWwodmFsdWUsIG5ld192YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3X3ZhbHVlO1xuICAgICAgICAgICAgaWYgKHN0b3ApIHsgLy8gc3RvcmUgaXMgcmVhZHlcbiAgICAgICAgICAgICAgICBjb25zdCBydW5fcXVldWUgPSAhc3Vic2NyaWJlcl9xdWV1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgIHNbMV0oKTtcbiAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlcl9xdWV1ZS5wdXNoKHMsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJ1bl9xdWV1ZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN1YnNjcmliZXJfcXVldWUubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJfcXVldWVbaV1bMF0oc3Vic2NyaWJlcl9xdWV1ZVtpICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJfcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gdXBkYXRlKGZuKSB7XG4gICAgICAgIHNldChmbih2YWx1ZSkpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdWJzY3JpYmUocnVuLCBpbnZhbGlkYXRlID0gbm9vcCkge1xuICAgICAgICBjb25zdCBzdWJzY3JpYmVyID0gW3J1biwgaW52YWxpZGF0ZV07XG4gICAgICAgIHN1YnNjcmliZXJzLnB1c2goc3Vic2NyaWJlcik7XG4gICAgICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHN0b3AgPSBzdGFydChzZXQpIHx8IG5vb3A7XG4gICAgICAgIH1cbiAgICAgICAgcnVuKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHN0b3AoKTtcbiAgICAgICAgICAgICAgICBzdG9wID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgc2V0LCB1cGRhdGUsIHN1YnNjcmliZSB9O1xufVxuZnVuY3Rpb24gZGVyaXZlZChzdG9yZXMsIGZuLCBpbml0aWFsX3ZhbHVlKSB7XG4gICAgY29uc3Qgc2luZ2xlID0gIUFycmF5LmlzQXJyYXkoc3RvcmVzKTtcbiAgICBjb25zdCBzdG9yZXNfYXJyYXkgPSBzaW5nbGVcbiAgICAgICAgPyBbc3RvcmVzXVxuICAgICAgICA6IHN0b3JlcztcbiAgICBjb25zdCBhdXRvID0gZm4ubGVuZ3RoIDwgMjtcbiAgICByZXR1cm4gcmVhZGFibGUoaW5pdGlhbF92YWx1ZSwgKHNldCkgPT4ge1xuICAgICAgICBsZXQgaW5pdGVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgcGVuZGluZyA9IDA7XG4gICAgICAgIGxldCBjbGVhbnVwID0gbm9vcDtcbiAgICAgICAgY29uc3Qgc3luYyA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZm4oc2luZ2xlID8gdmFsdWVzWzBdIDogdmFsdWVzLCBzZXQpO1xuICAgICAgICAgICAgaWYgKGF1dG8pIHtcbiAgICAgICAgICAgICAgICBzZXQocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNsZWFudXAgPSBpc19mdW5jdGlvbihyZXN1bHQpID8gcmVzdWx0IDogbm9vcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgdW5zdWJzY3JpYmVycyA9IHN0b3Jlc19hcnJheS5tYXAoKHN0b3JlLCBpKSA9PiBzdWJzY3JpYmUoc3RvcmUsICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdmFsdWVzW2ldID0gdmFsdWU7XG4gICAgICAgICAgICBwZW5kaW5nICY9IH4oMSA8PCBpKTtcbiAgICAgICAgICAgIGlmIChpbml0ZWQpIHtcbiAgICAgICAgICAgICAgICBzeW5jKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sICgpID0+IHtcbiAgICAgICAgICAgIHBlbmRpbmcgfD0gKDEgPDwgaSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgaW5pdGVkID0gdHJ1ZTtcbiAgICAgICAgc3luYygpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gc3RvcCgpIHtcbiAgICAgICAgICAgIHJ1bl9hbGwodW5zdWJzY3JpYmVycyk7XG4gICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgIH07XG4gICAgfSk7XG59XG5cbmV4cG9ydCB7IGRlcml2ZWQsIHJlYWRhYmxlLCB3cml0YWJsZSB9O1xuIiwiaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnO1xuXG5leHBvcnQgY29uc3QgQ09OVEVYVF9LRVkgPSB7fTtcblxuZXhwb3J0IGNvbnN0IHByZWxvYWQgPSAoKSA9PiAoe30pOyIsIjxzY3JpcHQ+XG5cdGV4cG9ydCBsZXQgc2VnbWVudDtcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG5cdG5hdiB7XG5cdFx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHJnYmEoMjU1LDYyLDAsMC4xKTtcblx0XHRmb250LXdlaWdodDogMzAwO1xuXHRcdHBhZGRpbmc6IDAgMWVtO1xuXHR9XG5cblx0dWwge1xuXHRcdG1hcmdpbjogMDtcblx0XHRwYWRkaW5nOiAwO1xuXHR9XG5cblx0LyogY2xlYXJmaXggKi9cblx0dWw6OmFmdGVyIHtcblx0XHRjb250ZW50OiAnJztcblx0XHRkaXNwbGF5OiBibG9jaztcblx0XHRjbGVhcjogYm90aDtcblx0fVxuXG5cdGxpIHtcblx0XHRkaXNwbGF5OiBibG9jaztcblx0XHRmbG9hdDogbGVmdDtcblx0fVxuXG5cdFthcmlhLWN1cnJlbnRdIHtcblx0XHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cdFx0ZGlzcGxheTogaW5saW5lLWJsb2NrO1xuXHR9XG5cblx0W2FyaWEtY3VycmVudF06OmFmdGVyIHtcblx0XHRwb3NpdGlvbjogYWJzb2x1dGU7XG5cdFx0Y29udGVudDogJyc7XG5cdFx0d2lkdGg6IGNhbGMoMTAwJSAtIDFlbSk7XG5cdFx0aGVpZ2h0OiAycHg7XG5cdFx0YmFja2dyb3VuZC1jb2xvcjogcmdiKDI1NSw2MiwwKTtcblx0XHRkaXNwbGF5OiBibG9jaztcblx0XHRib3R0b206IC0xcHg7XG5cdH1cblxuXHRhIHtcblx0XHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG5cdFx0cGFkZGluZzogMWVtIDAuNWVtO1xuXHRcdGRpc3BsYXk6IGJsb2NrO1xuXHR9XG48L3N0eWxlPlxuXG48bmF2PlxuXHQ8dWw+XG5cdFx0PGxpPjxhIGFyaWEtY3VycmVudD1cIntzZWdtZW50ID09PSB1bmRlZmluZWQgPyAncGFnZScgOiB1bmRlZmluZWR9XCIgaHJlZj1cIi5cIj5ob21lPC9hPjwvbGk+XG5cdFx0PGxpPjxhIGFyaWEtY3VycmVudD1cIntzZWdtZW50ID09PSAnYWJvdXQnID8gJ3BhZ2UnIDogdW5kZWZpbmVkfVwiIGhyZWY9XCJhYm91dFwiPmFib3V0PC9hPjwvbGk+XG5cblx0XHQ8IS0tIGZvciB0aGUgYmxvZyBsaW5rLCB3ZSdyZSB1c2luZyByZWw9cHJlZmV0Y2ggc28gdGhhdCBTYXBwZXIgcHJlZmV0Y2hlc1xuXHRcdCAgICAgdGhlIGJsb2cgZGF0YSB3aGVuIHdlIGhvdmVyIG92ZXIgdGhlIGxpbmsgb3IgdGFwIGl0IG9uIGEgdG91Y2hzY3JlZW4gLS0+XG5cdFx0PGxpPjxhIHJlbD1wcmVmZXRjaCBhcmlhLWN1cnJlbnQ9XCJ7c2VnbWVudCA9PT0gJ2Jsb2cnID8gJ3BhZ2UnIDogdW5kZWZpbmVkfVwiIGhyZWY9XCJibG9nXCI+YmxvZzwvYT48L2xpPlxuXHRcdDxsaT48YSBhcmlhLWN1cnJlbnQ9XCJ7c2VnbWVudCA9PT0gJ2F2YWlsYWJpbGl0eScgPyAncGFnZScgOiB1bmRlZmluZWR9XCIgaHJlZj1cImF2YWlsYWJpbGl0eVwiPkF2YWlsYWJpbGl0eTwvYT48L2xpPlxuXHQ8L3VsPlxuPC9uYXY+XG4iLCI8c2NyaXB0PlxuXHRpbXBvcnQgTmF2IGZyb20gJy4uL2NvbXBvbmVudHMvTmF2LnN2ZWx0ZSc7XG5cblx0ZXhwb3J0IGxldCBzZWdtZW50O1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cblx0bWFpbiB7XG5cdFx0cG9zaXRpb246IHJlbGF0aXZlO1xuXHRcdG1heC13aWR0aDogNTZlbTtcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcblx0XHRwYWRkaW5nOiAyZW07XG5cdFx0bWFyZ2luOiAwIGF1dG87XG5cdFx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcblx0fVxuPC9zdHlsZT5cblxuPE5hdiB7c2VnbWVudH0vPlxuXG48bWFpbj5cblx0PHNsb3Q+PC9zbG90PlxuPC9tYWluPiIsIjxzY3JpcHQ+XG5cdGV4cG9ydCBsZXQgc3RhdHVzO1xuXHRleHBvcnQgbGV0IGVycm9yO1xuXG5cdGNvbnN0IGRldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnO1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cblx0aDEsIHAge1xuXHRcdG1hcmdpbjogMCBhdXRvO1xuXHR9XG5cblx0aDEge1xuXHRcdGZvbnQtc2l6ZTogMi44ZW07XG5cdFx0Zm9udC13ZWlnaHQ6IDcwMDtcblx0XHRtYXJnaW46IDAgMCAwLjVlbSAwO1xuXHR9XG5cblx0cCB7XG5cdFx0bWFyZ2luOiAxZW0gYXV0bztcblx0fVxuXG5cdEBtZWRpYSAobWluLXdpZHRoOiA0ODBweCkge1xuXHRcdGgxIHtcblx0XHRcdGZvbnQtc2l6ZTogNGVtO1xuXHRcdH1cblx0fVxuPC9zdHlsZT5cblxuPHN2ZWx0ZTpoZWFkPlxuXHQ8dGl0bGU+e3N0YXR1c308L3RpdGxlPlxuPC9zdmVsdGU6aGVhZD5cblxuPGgxPntzdGF0dXN9PC9oMT5cblxuPHA+e2Vycm9yLm1lc3NhZ2V9PC9wPlxuXG57I2lmIGRldiAmJiBlcnJvci5zdGFja31cblx0PHByZT57ZXJyb3Iuc3RhY2t9PC9wcmU+XG57L2lmfVxuIiwiPCEtLSBUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkIGJ5IFNhcHBlciDigJQgZG8gbm90IGVkaXQgaXQhIC0tPlxuPHNjcmlwdD5cblx0aW1wb3J0IHsgc2V0Q29udGV4dCwgYWZ0ZXJVcGRhdGUgfSBmcm9tICdzdmVsdGUnO1xuXHRpbXBvcnQgeyBDT05URVhUX0tFWSB9IGZyb20gJy4vc2hhcmVkJztcblx0aW1wb3J0IExheW91dCBmcm9tICcuLi8uLi8uLi9yb3V0ZXMvX2xheW91dC5zdmVsdGUnO1xuXHRpbXBvcnQgRXJyb3IgZnJvbSAnLi4vLi4vLi4vcm91dGVzL19lcnJvci5zdmVsdGUnO1xuXG5cdGV4cG9ydCBsZXQgc3RvcmVzO1xuXHRleHBvcnQgbGV0IGVycm9yO1xuXHRleHBvcnQgbGV0IHN0YXR1cztcblx0ZXhwb3J0IGxldCBzZWdtZW50cztcblx0ZXhwb3J0IGxldCBsZXZlbDA7XG5cdGV4cG9ydCBsZXQgbGV2ZWwxID0gbnVsbDtcblx0ZXhwb3J0IGxldCBub3RpZnk7XG5cblx0YWZ0ZXJVcGRhdGUobm90aWZ5KTtcblx0c2V0Q29udGV4dChDT05URVhUX0tFWSwgc3RvcmVzKTtcbjwvc2NyaXB0PlxuXG48TGF5b3V0IHNlZ21lbnQ9XCJ7c2VnbWVudHNbMF19XCIgey4uLmxldmVsMC5wcm9wc30+XG5cdHsjaWYgZXJyb3J9XG5cdFx0PEVycm9yIHtlcnJvcn0ge3N0YXR1c30vPlxuXHR7OmVsc2V9XG5cdFx0PHN2ZWx0ZTpjb21wb25lbnQgdGhpcz1cIntsZXZlbDEuY29tcG9uZW50fVwiIHsuLi5sZXZlbDEucHJvcHN9Lz5cblx0ey9pZn1cbjwvTGF5b3V0PiIsIi8vIFRoaXMgZmlsZSBpcyBnZW5lcmF0ZWQgYnkgU2FwcGVyIOKAlCBkbyBub3QgZWRpdCBpdCFcbi8vIHdlYnBhY2sgZG9lcyBub3Qgc3VwcG9ydCBleHBvcnQgKiBhcyByb290X2NvbXAgeWV0IHNvIGRvIGEgdHdvIGxpbmUgaW1wb3J0L2V4cG9ydFxuaW1wb3J0ICogYXMgcm9vdF9jb21wIGZyb20gJy4uLy4uLy4uL3JvdXRlcy9fbGF5b3V0LnN2ZWx0ZSc7XG5leHBvcnQgeyByb290X2NvbXAgfTtcbmV4cG9ydCB7IGRlZmF1bHQgYXMgRXJyb3JDb21wb25lbnQgfSBmcm9tICcuLi8uLi8uLi9yb3V0ZXMvX2Vycm9yLnN2ZWx0ZSc7XG5cbmV4cG9ydCBjb25zdCBpZ25vcmUgPSBbL15cXC9ibG9nXFwuanNvbiQvLCAvXlxcL2Jsb2dcXC8oW14vXSs/KVxcLmpzb24kL107XG5cbmV4cG9ydCBjb25zdCBjb21wb25lbnRzID0gW1xuXHR7XG5cdFx0anM6ICgpID0+IGltcG9ydChcIi4uLy4uLy4uL3JvdXRlcy9pbmRleC5zdmVsdGVcIilcblx0fSxcblx0e1xuXHRcdGpzOiAoKSA9PiBpbXBvcnQoXCIuLi8uLi8uLi9yb3V0ZXMvYXZhaWxhYmlsaXR5LnN2ZWx0ZVwiKVxuXHR9LFxuXHR7XG5cdFx0anM6ICgpID0+IGltcG9ydChcIi4uLy4uLy4uL3JvdXRlcy9hYm91dC5zdmVsdGVcIilcblx0fSxcblx0e1xuXHRcdGpzOiAoKSA9PiBpbXBvcnQoXCIuLi8uLi8uLi9yb3V0ZXMvYmxvZy9pbmRleC5zdmVsdGVcIilcblx0fSxcblx0e1xuXHRcdGpzOiAoKSA9PiBpbXBvcnQoXCIuLi8uLi8uLi9yb3V0ZXMvYmxvZy9bc2x1Z10uc3ZlbHRlXCIpXG5cdH1cbl07XG5cbmV4cG9ydCBjb25zdCByb3V0ZXMgPSAoZCA9PiBbXG5cdHtcblx0XHQvLyBpbmRleC5zdmVsdGVcblx0XHRwYXR0ZXJuOiAvXlxcLyQvLFxuXHRcdHBhcnRzOiBbXG5cdFx0XHR7IGk6IDAgfVxuXHRcdF1cblx0fSxcblxuXHR7XG5cdFx0Ly8gYXZhaWxhYmlsaXR5LnN2ZWx0ZVxuXHRcdHBhdHRlcm46IC9eXFwvYXZhaWxhYmlsaXR5XFwvPyQvLFxuXHRcdHBhcnRzOiBbXG5cdFx0XHR7IGk6IDEgfVxuXHRcdF1cblx0fSxcblxuXHR7XG5cdFx0Ly8gYWJvdXQuc3ZlbHRlXG5cdFx0cGF0dGVybjogL15cXC9hYm91dFxcLz8kLyxcblx0XHRwYXJ0czogW1xuXHRcdFx0eyBpOiAyIH1cblx0XHRdXG5cdH0sXG5cblx0e1xuXHRcdC8vIGJsb2cvaW5kZXguc3ZlbHRlXG5cdFx0cGF0dGVybjogL15cXC9ibG9nXFwvPyQvLFxuXHRcdHBhcnRzOiBbXG5cdFx0XHR7IGk6IDMgfVxuXHRcdF1cblx0fSxcblxuXHR7XG5cdFx0Ly8gYmxvZy9bc2x1Z10uc3ZlbHRlXG5cdFx0cGF0dGVybjogL15cXC9ibG9nXFwvKFteL10rPylcXC8/JC8sXG5cdFx0cGFydHM6IFtcblx0XHRcdG51bGwsXG5cdFx0XHR7IGk6IDQsIHBhcmFtczogbWF0Y2ggPT4gKHsgc2x1ZzogZChtYXRjaFsxXSkgfSkgfVxuXHRcdF1cblx0fVxuXSkoZGVjb2RlVVJJQ29tcG9uZW50KTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdGltcG9ydChcIi9ob21lL3J1c3NlbGwvU2l0ZXMvYmVhbnMvZm9vZGV6ZS9ub2RlX21vZHVsZXMvc2FwcGVyL3NhcHBlci1kZXYtY2xpZW50LmpzXCIpLnRoZW4oY2xpZW50ID0+IHtcblx0XHRjbGllbnQuY29ubmVjdCgxMDAwMCk7XG5cdH0pO1xufSIsImltcG9ydCB7IGdldENvbnRleHQgfSBmcm9tICdzdmVsdGUnO1xuaW1wb3J0IHsgQ09OVEVYVF9LRVkgfSBmcm9tICcuL2ludGVybmFsL3NoYXJlZCc7XG5pbXBvcnQgeyB3cml0YWJsZSB9IGZyb20gJ3N2ZWx0ZS9zdG9yZSc7XG5pbXBvcnQgQXBwIGZyb20gJy4vaW50ZXJuYWwvQXBwLnN2ZWx0ZSc7XG5pbXBvcnQgeyBpZ25vcmUsIHJvdXRlcywgcm9vdF9jb21wLCBjb21wb25lbnRzLCBFcnJvckNvbXBvbmVudCB9IGZyb20gJy4vaW50ZXJuYWwvbWFuaWZlc3QtY2xpZW50JztcblxuLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuXHJcbmZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn1cblxuZnVuY3Rpb24gcHJlZmV0Y2goaHJlZikge1xyXG4gICAgY29uc3QgdGFyZ2V0ID0gc2VsZWN0X3RhcmdldChuZXcgVVJMKGhyZWYsIGRvY3VtZW50LmJhc2VVUkkpKTtcclxuICAgIGlmICh0YXJnZXQpIHtcclxuICAgICAgICBpZiAoIXByZWZldGNoaW5nIHx8IGhyZWYgIT09IHByZWZldGNoaW5nLmhyZWYpIHtcclxuICAgICAgICAgICAgc2V0X3ByZWZldGNoaW5nKGhyZWYsIGh5ZHJhdGVfdGFyZ2V0KHRhcmdldCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcHJlZmV0Y2hpbmcucHJvbWlzZTtcclxuICAgIH1cclxufVxuXG5sZXQgdWlkID0gMTtcclxuZnVuY3Rpb24gc2V0X3VpZChuKSB7XHJcbiAgICB1aWQgPSBuO1xyXG59XHJcbmxldCBjaWQ7XHJcbmZ1bmN0aW9uIHNldF9jaWQobikge1xyXG4gICAgY2lkID0gbjtcclxufVxyXG5jb25zdCBfaGlzdG9yeSA9IHR5cGVvZiBoaXN0b3J5ICE9PSAndW5kZWZpbmVkJyA/IGhpc3RvcnkgOiB7XHJcbiAgICBwdXNoU3RhdGU6IChzdGF0ZSwgdGl0bGUsIGhyZWYpID0+IHsgfSxcclxuICAgIHJlcGxhY2VTdGF0ZTogKHN0YXRlLCB0aXRsZSwgaHJlZikgPT4geyB9LFxyXG4gICAgc2Nyb2xsUmVzdG9yYXRpb246ICcnXHJcbn07XHJcbmNvbnN0IHNjcm9sbF9oaXN0b3J5ID0ge307XHJcbmZ1bmN0aW9uIGxvYWRfY3VycmVudF9wYWdlKCkge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHsgaGFzaCwgaHJlZiB9ID0gbG9jYXRpb247XHJcbiAgICAgICAgX2hpc3RvcnkucmVwbGFjZVN0YXRlKHsgaWQ6IHVpZCB9LCAnJywgaHJlZik7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gc2VsZWN0X3RhcmdldChuZXcgVVJMKGxvY2F0aW9uLmhyZWYpKTtcclxuICAgICAgICBpZiAodGFyZ2V0KVxyXG4gICAgICAgICAgICByZXR1cm4gbmF2aWdhdGUodGFyZ2V0LCB1aWQsIHRydWUsIGhhc2gpO1xyXG4gICAgfSk7XHJcbn1cclxubGV0IGJhc2VfdXJsO1xyXG5sZXQgaGFuZGxlX3RhcmdldDtcclxuZnVuY3Rpb24gaW5pdChiYXNlLCBoYW5kbGVyKSB7XHJcbiAgICBiYXNlX3VybCA9IGJhc2U7XHJcbiAgICBoYW5kbGVfdGFyZ2V0ID0gaGFuZGxlcjtcclxuICAgIGlmICgnc2Nyb2xsUmVzdG9yYXRpb24nIGluIF9oaXN0b3J5KSB7XHJcbiAgICAgICAgX2hpc3Rvcnkuc2Nyb2xsUmVzdG9yYXRpb24gPSAnbWFudWFsJztcclxuICAgIH1cclxuICAgIC8vIEFkb3B0ZWQgZnJvbSBOdXh0LmpzXHJcbiAgICAvLyBSZXNldCBzY3JvbGxSZXN0b3JhdGlvbiB0byBhdXRvIHdoZW4gbGVhdmluZyBwYWdlLCBhbGxvd2luZyBwYWdlIHJlbG9hZFxyXG4gICAgLy8gYW5kIGJhY2stbmF2aWdhdGlvbiBmcm9tIG90aGVyIHBhZ2VzIHRvIHVzZSB0aGUgYnJvd3NlciB0byByZXN0b3JlIHRoZVxyXG4gICAgLy8gc2Nyb2xsaW5nIHBvc2l0aW9uLlxyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xyXG4gICAgICAgIF9oaXN0b3J5LnNjcm9sbFJlc3RvcmF0aW9uID0gJ2F1dG8nO1xyXG4gICAgfSk7XHJcbiAgICAvLyBTZXR0aW5nIHNjcm9sbFJlc3RvcmF0aW9uIHRvIG1hbnVhbCBhZ2FpbiB3aGVuIHJldHVybmluZyB0byB0aGlzIHBhZ2UuXHJcbiAgICBhZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4ge1xyXG4gICAgICAgIF9oaXN0b3J5LnNjcm9sbFJlc3RvcmF0aW9uID0gJ21hbnVhbCc7XHJcbiAgICB9KTtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgaGFuZGxlX2NsaWNrKTtcclxuICAgIGFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgaGFuZGxlX3BvcHN0YXRlKTtcclxuICAgIC8vIHByZWZldGNoXHJcbiAgICBhZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdHJpZ2dlcl9wcmVmZXRjaCk7XHJcbiAgICBhZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBoYW5kbGVfbW91c2Vtb3ZlKTtcclxufVxyXG5mdW5jdGlvbiBleHRyYWN0X3F1ZXJ5KHNlYXJjaCkge1xyXG4gICAgY29uc3QgcXVlcnkgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xyXG4gICAgaWYgKHNlYXJjaC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgc2VhcmNoLnNsaWNlKDEpLnNwbGl0KCcmJykuZm9yRWFjaChzZWFyY2hQYXJhbSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IFssIGtleSwgdmFsdWUgPSAnJ10gPSAvKFtePV0qKSg/Oj0oLiopKT8vLmV4ZWMoZGVjb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpKSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcXVlcnlba2V5XSA9PT0gJ3N0cmluZycpXHJcbiAgICAgICAgICAgICAgICBxdWVyeVtrZXldID0gW3F1ZXJ5W2tleV1dO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHF1ZXJ5W2tleV0gPT09ICdvYmplY3QnKVxyXG4gICAgICAgICAgICAgICAgcXVlcnlba2V5XS5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgcXVlcnlba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHF1ZXJ5O1xyXG59XHJcbmZ1bmN0aW9uIHNlbGVjdF90YXJnZXQodXJsKSB7XHJcbiAgICBpZiAodXJsLm9yaWdpbiAhPT0gbG9jYXRpb24ub3JpZ2luKVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgaWYgKCF1cmwucGF0aG5hbWUuc3RhcnRzV2l0aChiYXNlX3VybCkpXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICBsZXQgcGF0aCA9IHVybC5wYXRobmFtZS5zbGljZShiYXNlX3VybC5sZW5ndGgpO1xyXG4gICAgaWYgKHBhdGggPT09ICcnKSB7XHJcbiAgICAgICAgcGF0aCA9ICcvJztcclxuICAgIH1cclxuICAgIC8vIGF2b2lkIGFjY2lkZW50YWwgY2xhc2hlcyBiZXR3ZWVuIHNlcnZlciByb3V0ZXMgYW5kIHBhZ2Ugcm91dGVzXHJcbiAgICBpZiAoaWdub3JlLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QocGF0aCkpKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm91dGVzLmxlbmd0aDsgaSArPSAxKSB7XHJcbiAgICAgICAgY29uc3Qgcm91dGUgPSByb3V0ZXNbaV07XHJcbiAgICAgICAgY29uc3QgbWF0Y2ggPSByb3V0ZS5wYXR0ZXJuLmV4ZWMocGF0aCk7XHJcbiAgICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHF1ZXJ5ID0gZXh0cmFjdF9xdWVyeSh1cmwuc2VhcmNoKTtcclxuICAgICAgICAgICAgY29uc3QgcGFydCA9IHJvdXRlLnBhcnRzW3JvdXRlLnBhcnRzLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBwYXJ0LnBhcmFtcyA/IHBhcnQucGFyYW1zKG1hdGNoKSA6IHt9O1xyXG4gICAgICAgICAgICBjb25zdCBwYWdlID0geyBob3N0OiBsb2NhdGlvbi5ob3N0LCBwYXRoLCBxdWVyeSwgcGFyYW1zIH07XHJcbiAgICAgICAgICAgIHJldHVybiB7IGhyZWY6IHVybC5ocmVmLCByb3V0ZSwgbWF0Y2gsIHBhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxubGV0IG1vdXNlbW92ZV90aW1lb3V0O1xyXG5mdW5jdGlvbiBoYW5kbGVfbW91c2Vtb3ZlKGV2ZW50KSB7XHJcbiAgICBjbGVhclRpbWVvdXQobW91c2Vtb3ZlX3RpbWVvdXQpO1xyXG4gICAgbW91c2Vtb3ZlX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICB0cmlnZ2VyX3ByZWZldGNoKGV2ZW50KTtcclxuICAgIH0sIDIwKTtcclxufVxyXG5mdW5jdGlvbiB0cmlnZ2VyX3ByZWZldGNoKGV2ZW50KSB7XHJcbiAgICBjb25zdCBhID0gZmluZF9hbmNob3IoZXZlbnQudGFyZ2V0KTtcclxuICAgIGlmICghYSB8fCBhLnJlbCAhPT0gJ3ByZWZldGNoJylcclxuICAgICAgICByZXR1cm47XHJcbiAgICBwcmVmZXRjaChhLmhyZWYpO1xyXG59XHJcbmZ1bmN0aW9uIGhhbmRsZV9jbGljayhldmVudCkge1xyXG4gICAgLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9wYWdlLmpzXHJcbiAgICAvLyBNSVQgbGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvcGFnZS5qcyNsaWNlbnNlXHJcbiAgICBpZiAod2hpY2goZXZlbnQpICE9PSAxKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIGlmIChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQuc2hpZnRLZXkgfHwgZXZlbnQuYWx0S2V5KVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIGNvbnN0IGEgPSBmaW5kX2FuY2hvcihldmVudC50YXJnZXQpO1xyXG4gICAgaWYgKCFhKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIGlmICghYS5ocmVmKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIC8vIGNoZWNrIGlmIGxpbmsgaXMgaW5zaWRlIGFuIHN2Z1xyXG4gICAgLy8gaW4gdGhpcyBjYXNlLCBib3RoIGhyZWYgYW5kIHRhcmdldCBhcmUgYWx3YXlzIGluc2lkZSBhbiBvYmplY3RcclxuICAgIGNvbnN0IHN2ZyA9IHR5cGVvZiBhLmhyZWYgPT09ICdvYmplY3QnICYmIGEuaHJlZi5jb25zdHJ1Y3Rvci5uYW1lID09PSAnU1ZHQW5pbWF0ZWRTdHJpbmcnO1xyXG4gICAgY29uc3QgaHJlZiA9IFN0cmluZyhzdmcgPyBhLmhyZWYuYmFzZVZhbCA6IGEuaHJlZik7XHJcbiAgICBpZiAoaHJlZiA9PT0gbG9jYXRpb24uaHJlZikge1xyXG4gICAgICAgIGlmICghbG9jYXRpb24uaGFzaClcclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBJZ25vcmUgaWYgdGFnIGhhc1xyXG4gICAgLy8gMS4gJ2Rvd25sb2FkJyBhdHRyaWJ1dGVcclxuICAgIC8vIDIuIHJlbD0nZXh0ZXJuYWwnIGF0dHJpYnV0ZVxyXG4gICAgaWYgKGEuaGFzQXR0cmlidXRlKCdkb3dubG9hZCcpIHx8IGEuZ2V0QXR0cmlidXRlKCdyZWwnKSA9PT0gJ2V4dGVybmFsJylcclxuICAgICAgICByZXR1cm47XHJcbiAgICAvLyBJZ25vcmUgaWYgPGE+IGhhcyBhIHRhcmdldFxyXG4gICAgaWYgKHN2ZyA/IGEudGFyZ2V0LmJhc2VWYWwgOiBhLnRhcmdldClcclxuICAgICAgICByZXR1cm47XHJcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKGhyZWYpO1xyXG4gICAgLy8gRG9uJ3QgaGFuZGxlIGhhc2ggY2hhbmdlc1xyXG4gICAgaWYgKHVybC5wYXRobmFtZSA9PT0gbG9jYXRpb24ucGF0aG5hbWUgJiYgdXJsLnNlYXJjaCA9PT0gbG9jYXRpb24uc2VhcmNoKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIGNvbnN0IHRhcmdldCA9IHNlbGVjdF90YXJnZXQodXJsKTtcclxuICAgIGlmICh0YXJnZXQpIHtcclxuICAgICAgICBjb25zdCBub3Njcm9sbCA9IGEuaGFzQXR0cmlidXRlKCdzYXBwZXI6bm9zY3JvbGwnKTtcclxuICAgICAgICBuYXZpZ2F0ZSh0YXJnZXQsIG51bGwsIG5vc2Nyb2xsLCB1cmwuaGFzaCk7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBfaGlzdG9yeS5wdXNoU3RhdGUoeyBpZDogY2lkIH0sICcnLCB1cmwuaHJlZik7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gd2hpY2goZXZlbnQpIHtcclxuICAgIHJldHVybiBldmVudC53aGljaCA9PT0gbnVsbCA/IGV2ZW50LmJ1dHRvbiA6IGV2ZW50LndoaWNoO1xyXG59XHJcbmZ1bmN0aW9uIGZpbmRfYW5jaG9yKG5vZGUpIHtcclxuICAgIHdoaWxlIChub2RlICYmIG5vZGUubm9kZU5hbWUudG9VcHBlckNhc2UoKSAhPT0gJ0EnKVxyXG4gICAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7IC8vIFNWRyA8YT4gZWxlbWVudHMgaGF2ZSBhIGxvd2VyY2FzZSBuYW1lXHJcbiAgICByZXR1cm4gbm9kZTtcclxufVxyXG5mdW5jdGlvbiBzY3JvbGxfc3RhdGUoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBhZ2VYT2Zmc2V0LFxyXG4gICAgICAgIHk6IHBhZ2VZT2Zmc2V0XHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIGhhbmRsZV9wb3BzdGF0ZShldmVudCkge1xyXG4gICAgc2Nyb2xsX2hpc3RvcnlbY2lkXSA9IHNjcm9sbF9zdGF0ZSgpO1xyXG4gICAgaWYgKGV2ZW50LnN0YXRlKSB7XHJcbiAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBzZWxlY3RfdGFyZ2V0KHVybCk7XHJcbiAgICAgICAgaWYgKHRhcmdldCkge1xyXG4gICAgICAgICAgICBuYXZpZ2F0ZSh0YXJnZXQsIGV2ZW50LnN0YXRlLmlkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxyXG4gICAgICAgICAgICBsb2NhdGlvbi5ocmVmID0gbG9jYXRpb24uaHJlZjsgLy8gbm9zb25hclxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIC8vIGhhc2hjaGFuZ2VcclxuICAgICAgICBzZXRfdWlkKHVpZCArIDEpO1xyXG4gICAgICAgIHNldF9jaWQodWlkKTtcclxuICAgICAgICBfaGlzdG9yeS5yZXBsYWNlU3RhdGUoeyBpZDogY2lkIH0sICcnLCBsb2NhdGlvbi5ocmVmKTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBuYXZpZ2F0ZShkZXN0LCBpZCwgbm9zY3JvbGwsIGhhc2gpIHtcclxuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgcG9wc3RhdGUgPSAhIWlkO1xyXG4gICAgICAgIGlmIChwb3BzdGF0ZSkge1xyXG4gICAgICAgICAgICBjaWQgPSBpZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRfc2Nyb2xsID0gc2Nyb2xsX3N0YXRlKCk7XHJcbiAgICAgICAgICAgIC8vIGNsaWNrZWQgb24gYSBsaW5rLiBwcmVzZXJ2ZSBzY3JvbGwgc3RhdGVcclxuICAgICAgICAgICAgc2Nyb2xsX2hpc3RvcnlbY2lkXSA9IGN1cnJlbnRfc2Nyb2xsO1xyXG4gICAgICAgICAgICBjaWQgPSBpZCA9ICsrdWlkO1xyXG4gICAgICAgICAgICBzY3JvbGxfaGlzdG9yeVtjaWRdID0gbm9zY3JvbGwgPyBjdXJyZW50X3Njcm9sbCA6IHsgeDogMCwgeTogMCB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICB5aWVsZCBoYW5kbGVfdGFyZ2V0KGRlc3QpO1xyXG4gICAgICAgIGlmIChkb2N1bWVudC5hY3RpdmVFbGVtZW50ICYmIChkb2N1bWVudC5hY3RpdmVFbGVtZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxyXG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50LmJsdXIoKTtcclxuICAgICAgICBpZiAoIW5vc2Nyb2xsKSB7XHJcbiAgICAgICAgICAgIGxldCBzY3JvbGwgPSBzY3JvbGxfaGlzdG9yeVtpZF07XHJcbiAgICAgICAgICAgIGxldCBkZWVwX2xpbmtlZDtcclxuICAgICAgICAgICAgaWYgKGhhc2gpIHtcclxuICAgICAgICAgICAgICAgIC8vIHNjcm9sbCBpcyBhbiBlbGVtZW50IGlkIChmcm9tIGEgaGFzaCksIHdlIG5lZWQgdG8gY29tcHV0ZSB5LlxyXG4gICAgICAgICAgICAgICAgZGVlcF9saW5rZWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChoYXNoLnNsaWNlKDEpKTtcclxuICAgICAgICAgICAgICAgIGlmIChkZWVwX2xpbmtlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogZGVlcF9saW5rZWQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgc2Nyb2xsWVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2Nyb2xsX2hpc3RvcnlbY2lkXSA9IHNjcm9sbDtcclxuICAgICAgICAgICAgaWYgKHBvcHN0YXRlIHx8IGRlZXBfbGlua2VkKSB7XHJcbiAgICAgICAgICAgICAgICBzY3JvbGxUbyhzY3JvbGwueCwgc2Nyb2xsLnkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2Nyb2xsVG8oMCwgMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxuXG5mdW5jdGlvbiBnb3RvKGhyZWYsIG9wdHMgPSB7IG5vc2Nyb2xsOiBmYWxzZSwgcmVwbGFjZVN0YXRlOiBmYWxzZSB9KSB7XHJcbiAgICBjb25zdCB0YXJnZXQgPSBzZWxlY3RfdGFyZ2V0KG5ldyBVUkwoaHJlZiwgZG9jdW1lbnQuYmFzZVVSSSkpO1xyXG4gICAgaWYgKHRhcmdldCkge1xyXG4gICAgICAgIF9oaXN0b3J5W29wdHMucmVwbGFjZVN0YXRlID8gJ3JlcGxhY2VTdGF0ZScgOiAncHVzaFN0YXRlJ10oeyBpZDogY2lkIH0sICcnLCBocmVmKTtcclxuICAgICAgICByZXR1cm4gbmF2aWdhdGUodGFyZ2V0LCBudWxsLCBvcHRzLm5vc2Nyb2xsKS50aGVuKCgpID0+IHsgfSk7XHJcbiAgICB9XHJcbiAgICBsb2NhdGlvbi5ocmVmID0gaHJlZjtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmID0+IHsgfSk7IC8vIG5ldmVyIHJlc29sdmVzXHJcbn1cblxuZnVuY3Rpb24gcGFnZV9zdG9yZSh2YWx1ZSkge1xyXG4gICAgY29uc3Qgc3RvcmUgPSB3cml0YWJsZSh2YWx1ZSk7XHJcbiAgICBsZXQgcmVhZHkgPSB0cnVlO1xyXG4gICAgZnVuY3Rpb24gbm90aWZ5KCkge1xyXG4gICAgICAgIHJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBzdG9yZS51cGRhdGUodmFsID0+IHZhbCk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBzZXQobmV3X3ZhbHVlKSB7XHJcbiAgICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgICAgICBzdG9yZS5zZXQobmV3X3ZhbHVlKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShydW4pIHtcclxuICAgICAgICBsZXQgb2xkX3ZhbHVlO1xyXG4gICAgICAgIHJldHVybiBzdG9yZS5zdWJzY3JpYmUoKG5ld192YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAob2xkX3ZhbHVlID09PSB1bmRlZmluZWQgfHwgKHJlYWR5ICYmIG5ld192YWx1ZSAhPT0gb2xkX3ZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcnVuKG9sZF92YWx1ZSA9IG5ld192YWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiB7IG5vdGlmeSwgc2V0LCBzdWJzY3JpYmUgfTtcclxufVxuXG5jb25zdCBpbml0aWFsX2RhdGEgPSB0eXBlb2YgX19TQVBQRVJfXyAhPT0gJ3VuZGVmaW5lZCcgJiYgX19TQVBQRVJfXztcclxubGV0IHJlYWR5ID0gZmFsc2U7XHJcbmxldCByb290X2NvbXBvbmVudDtcclxubGV0IGN1cnJlbnRfdG9rZW47XHJcbmxldCByb290X3ByZWxvYWRlZDtcclxubGV0IGN1cnJlbnRfYnJhbmNoID0gW107XHJcbmxldCBjdXJyZW50X3F1ZXJ5ID0gJ3t9JztcclxuY29uc3Qgc3RvcmVzID0ge1xyXG4gICAgcGFnZTogcGFnZV9zdG9yZSh7fSksXHJcbiAgICBwcmVsb2FkaW5nOiB3cml0YWJsZShudWxsKSxcclxuICAgIHNlc3Npb246IHdyaXRhYmxlKGluaXRpYWxfZGF0YSAmJiBpbml0aWFsX2RhdGEuc2Vzc2lvbilcclxufTtcclxubGV0ICRzZXNzaW9uO1xyXG5sZXQgc2Vzc2lvbl9kaXJ0eTtcclxuc3RvcmVzLnNlc3Npb24uc3Vic2NyaWJlKCh2YWx1ZSkgPT4gX19hd2FpdGVyKHZvaWQgMCwgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAkc2Vzc2lvbiA9IHZhbHVlO1xyXG4gICAgaWYgKCFyZWFkeSlcclxuICAgICAgICByZXR1cm47XHJcbiAgICBzZXNzaW9uX2RpcnR5ID0gdHJ1ZTtcclxuICAgIGNvbnN0IGRlc3QgPSBzZWxlY3RfdGFyZ2V0KG5ldyBVUkwobG9jYXRpb24uaHJlZikpO1xyXG4gICAgY29uc3QgdG9rZW4gPSBjdXJyZW50X3Rva2VuID0ge307XHJcbiAgICBjb25zdCB7IHJlZGlyZWN0LCBwcm9wcywgYnJhbmNoIH0gPSB5aWVsZCBoeWRyYXRlX3RhcmdldChkZXN0KTtcclxuICAgIGlmICh0b2tlbiAhPT0gY3VycmVudF90b2tlbilcclxuICAgICAgICByZXR1cm47IC8vIGEgc2Vjb25kYXJ5IG5hdmlnYXRpb24gaGFwcGVuZWQgd2hpbGUgd2Ugd2VyZSBsb2FkaW5nXHJcbiAgICBpZiAocmVkaXJlY3QpIHtcclxuICAgICAgICB5aWVsZCBnb3RvKHJlZGlyZWN0LmxvY2F0aW9uLCB7IHJlcGxhY2VTdGF0ZTogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHlpZWxkIHJlbmRlcihicmFuY2gsIHByb3BzLCBkZXN0LnBhZ2UpO1xyXG4gICAgfVxyXG59KSk7XHJcbmxldCBwcmVmZXRjaGluZyA9IG51bGw7XHJcbmZ1bmN0aW9uIHNldF9wcmVmZXRjaGluZyhocmVmLCBwcm9taXNlKSB7XHJcbiAgICBwcmVmZXRjaGluZyA9IHsgaHJlZiwgcHJvbWlzZSB9O1xyXG59XHJcbmxldCB0YXJnZXQ7XHJcbmZ1bmN0aW9uIHNldF90YXJnZXQoZWxlbWVudCkge1xyXG4gICAgdGFyZ2V0ID0gZWxlbWVudDtcclxufVxyXG5mdW5jdGlvbiBzdGFydChvcHRzKSB7XHJcbiAgICBzZXRfdGFyZ2V0KG9wdHMudGFyZ2V0KTtcclxuICAgIGluaXQoaW5pdGlhbF9kYXRhLmJhc2VVcmwsIGhhbmRsZV90YXJnZXQkMSk7XHJcbiAgICBpZiAoaW5pdGlhbF9kYXRhLmVycm9yKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlX2Vycm9yKG5ldyBVUkwobG9jYXRpb24uaHJlZikpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxvYWRfY3VycmVudF9wYWdlKCk7XHJcbn1cclxuZnVuY3Rpb24gaGFuZGxlX2Vycm9yKHVybCkge1xyXG4gICAgY29uc3QgeyBob3N0LCBwYXRobmFtZSwgc2VhcmNoIH0gPSBsb2NhdGlvbjtcclxuICAgIGNvbnN0IHsgc2Vzc2lvbiwgcHJlbG9hZGVkLCBzdGF0dXMsIGVycm9yIH0gPSBpbml0aWFsX2RhdGE7XHJcbiAgICBpZiAoIXJvb3RfcHJlbG9hZGVkKSB7XHJcbiAgICAgICAgcm9vdF9wcmVsb2FkZWQgPSBwcmVsb2FkZWQgJiYgcHJlbG9hZGVkWzBdO1xyXG4gICAgfVxyXG4gICAgY29uc3QgcHJvcHMgPSB7XHJcbiAgICAgICAgZXJyb3IsXHJcbiAgICAgICAgc3RhdHVzLFxyXG4gICAgICAgIHNlc3Npb24sXHJcbiAgICAgICAgbGV2ZWwwOiB7XHJcbiAgICAgICAgICAgIHByb3BzOiByb290X3ByZWxvYWRlZFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGV2ZWwxOiB7XHJcbiAgICAgICAgICAgIHByb3BzOiB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMsXHJcbiAgICAgICAgICAgICAgICBlcnJvclxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb21wb25lbnQ6IEVycm9yQ29tcG9uZW50XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWdtZW50czogcHJlbG9hZGVkXHJcbiAgICB9O1xyXG4gICAgY29uc3QgcXVlcnkgPSBleHRyYWN0X3F1ZXJ5KHNlYXJjaCk7XHJcbiAgICByZW5kZXIoW10sIHByb3BzLCB7IGhvc3QsIHBhdGg6IHBhdGhuYW1lLCBxdWVyeSwgcGFyYW1zOiB7fSB9KTtcclxufVxyXG5mdW5jdGlvbiBoYW5kbGVfdGFyZ2V0JDEoZGVzdCkge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICBpZiAocm9vdF9jb21wb25lbnQpXHJcbiAgICAgICAgICAgIHN0b3Jlcy5wcmVsb2FkaW5nLnNldCh0cnVlKTtcclxuICAgICAgICBjb25zdCBsb2FkZWQgPSBwcmVmZXRjaGluZyAmJiBwcmVmZXRjaGluZy5ocmVmID09PSBkZXN0LmhyZWYgP1xyXG4gICAgICAgICAgICBwcmVmZXRjaGluZy5wcm9taXNlIDpcclxuICAgICAgICAgICAgaHlkcmF0ZV90YXJnZXQoZGVzdCk7XHJcbiAgICAgICAgcHJlZmV0Y2hpbmcgPSBudWxsO1xyXG4gICAgICAgIGNvbnN0IHRva2VuID0gY3VycmVudF90b2tlbiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IGxvYWRlZF9yZXN1bHQgPSB5aWVsZCBsb2FkZWQ7XHJcbiAgICAgICAgY29uc3QgeyByZWRpcmVjdCB9ID0gbG9hZGVkX3Jlc3VsdDtcclxuICAgICAgICBpZiAodG9rZW4gIT09IGN1cnJlbnRfdG9rZW4pXHJcbiAgICAgICAgICAgIHJldHVybjsgLy8gYSBzZWNvbmRhcnkgbmF2aWdhdGlvbiBoYXBwZW5lZCB3aGlsZSB3ZSB3ZXJlIGxvYWRpbmdcclxuICAgICAgICBpZiAocmVkaXJlY3QpIHtcclxuICAgICAgICAgICAgeWllbGQgZ290byhyZWRpcmVjdC5sb2NhdGlvbiwgeyByZXBsYWNlU3RhdGU6IHRydWUgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCB7IHByb3BzLCBicmFuY2ggfSA9IGxvYWRlZF9yZXN1bHQ7XHJcbiAgICAgICAgICAgIHlpZWxkIHJlbmRlcihicmFuY2gsIHByb3BzLCBkZXN0LnBhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbmZ1bmN0aW9uIHJlbmRlcihicmFuY2gsIHByb3BzLCBwYWdlKSB7XHJcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIHN0b3Jlcy5wYWdlLnNldChwYWdlKTtcclxuICAgICAgICBzdG9yZXMucHJlbG9hZGluZy5zZXQoZmFsc2UpO1xyXG4gICAgICAgIGlmIChyb290X2NvbXBvbmVudCkge1xyXG4gICAgICAgICAgICByb290X2NvbXBvbmVudC4kc2V0KHByb3BzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHByb3BzLnN0b3JlcyA9IHtcclxuICAgICAgICAgICAgICAgIHBhZ2U6IHsgc3Vic2NyaWJlOiBzdG9yZXMucGFnZS5zdWJzY3JpYmUgfSxcclxuICAgICAgICAgICAgICAgIHByZWxvYWRpbmc6IHsgc3Vic2NyaWJlOiBzdG9yZXMucHJlbG9hZGluZy5zdWJzY3JpYmUgfSxcclxuICAgICAgICAgICAgICAgIHNlc3Npb246IHN0b3Jlcy5zZXNzaW9uXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHByb3BzLmxldmVsMCA9IHtcclxuICAgICAgICAgICAgICAgIHByb3BzOiB5aWVsZCByb290X3ByZWxvYWRlZFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBwcm9wcy5ub3RpZnkgPSBzdG9yZXMucGFnZS5ub3RpZnk7XHJcbiAgICAgICAgICAgIHJvb3RfY29tcG9uZW50ID0gbmV3IEFwcCh7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQsXHJcbiAgICAgICAgICAgICAgICBwcm9wcyxcclxuICAgICAgICAgICAgICAgIGh5ZHJhdGU6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRfYnJhbmNoID0gYnJhbmNoO1xyXG4gICAgICAgIGN1cnJlbnRfcXVlcnkgPSBKU09OLnN0cmluZ2lmeShwYWdlLnF1ZXJ5KTtcclxuICAgICAgICByZWFkeSA9IHRydWU7XHJcbiAgICAgICAgc2Vzc2lvbl9kaXJ0eSA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbn1cclxuZnVuY3Rpb24gcGFydF9jaGFuZ2VkKGksIHNlZ21lbnQsIG1hdGNoLCBzdHJpbmdpZmllZF9xdWVyeSkge1xyXG4gICAgLy8gVE9ETyBvbmx5IGNoZWNrIHF1ZXJ5IHN0cmluZyBjaGFuZ2VzIGZvciBwcmVsb2FkIGZ1bmN0aW9uc1xyXG4gICAgLy8gdGhhdCBkbyBpbiBmYWN0IGRlcGVuZCBvbiBpdCAodXNpbmcgc3RhdGljIGFuYWx5c2lzIG9yXHJcbiAgICAvLyBydW50aW1lIGluc3RydW1lbnRhdGlvbilcclxuICAgIGlmIChzdHJpbmdpZmllZF9xdWVyeSAhPT0gY3VycmVudF9xdWVyeSlcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIGNvbnN0IHByZXZpb3VzID0gY3VycmVudF9icmFuY2hbaV07XHJcbiAgICBpZiAoIXByZXZpb3VzKVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIGlmIChzZWdtZW50ICE9PSBwcmV2aW91cy5zZWdtZW50KVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgaWYgKHByZXZpb3VzLm1hdGNoKSB7XHJcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KHByZXZpb3VzLm1hdGNoLnNsaWNlKDEsIGkgKyAyKSkgIT09IEpTT04uc3RyaW5naWZ5KG1hdGNoLnNsaWNlKDEsIGkgKyAyKSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIGh5ZHJhdGVfdGFyZ2V0KGRlc3QpIHtcclxuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgY29uc3QgeyByb3V0ZSwgcGFnZSB9ID0gZGVzdDtcclxuICAgICAgICBjb25zdCBzZWdtZW50cyA9IHBhZ2UucGF0aC5zcGxpdCgnLycpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICBsZXQgcmVkaXJlY3QgPSBudWxsO1xyXG4gICAgICAgIGNvbnN0IHByb3BzID0geyBlcnJvcjogbnVsbCwgc3RhdHVzOiAyMDAsIHNlZ21lbnRzOiBbc2VnbWVudHNbMF1dIH07XHJcbiAgICAgICAgY29uc3QgcHJlbG9hZF9jb250ZXh0ID0ge1xyXG4gICAgICAgICAgICBmZXRjaDogKHVybCwgb3B0cykgPT4gZmV0Y2godXJsLCBvcHRzKSxcclxuICAgICAgICAgICAgcmVkaXJlY3Q6IChzdGF0dXNDb2RlLCBsb2NhdGlvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlZGlyZWN0ICYmIChyZWRpcmVjdC5zdGF0dXNDb2RlICE9PSBzdGF0dXNDb2RlIHx8IHJlZGlyZWN0LmxvY2F0aW9uICE9PSBsb2NhdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0aW5nIHJlZGlyZWN0c2ApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVkaXJlY3QgPSB7IHN0YXR1c0NvZGUsIGxvY2F0aW9uIH07XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVycm9yOiAoc3RhdHVzLCBlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXJyb3IgPSB0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnID8gbmV3IEVycm9yKGVycm9yKSA6IGVycm9yO1xyXG4gICAgICAgICAgICAgICAgcHJvcHMuc3RhdHVzID0gc3RhdHVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAoIXJvb3RfcHJlbG9hZGVkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvb3RfcHJlbG9hZCA9IHJvb3RfY29tcC5wcmVsb2FkIHx8ICgoKSA9PiB7IH0pO1xyXG4gICAgICAgICAgICByb290X3ByZWxvYWRlZCA9IGluaXRpYWxfZGF0YS5wcmVsb2FkZWRbMF0gfHwgcm9vdF9wcmVsb2FkLmNhbGwocHJlbG9hZF9jb250ZXh0LCB7XHJcbiAgICAgICAgICAgICAgICBob3N0OiBwYWdlLmhvc3QsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBwYWdlLnBhdGgsXHJcbiAgICAgICAgICAgICAgICBxdWVyeTogcGFnZS5xdWVyeSxcclxuICAgICAgICAgICAgICAgIHBhcmFtczoge31cclxuICAgICAgICAgICAgfSwgJHNlc3Npb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgYnJhbmNoO1xyXG4gICAgICAgIGxldCBsID0gMTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzdHJpbmdpZmllZF9xdWVyeSA9IEpTT04uc3RyaW5naWZ5KHBhZ2UucXVlcnkpO1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IHJvdXRlLnBhdHRlcm4uZXhlYyhwYWdlLnBhdGgpO1xyXG4gICAgICAgICAgICBsZXQgc2VnbWVudF9kaXJ0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmFuY2ggPSB5aWVsZCBQcm9taXNlLmFsbChyb3V0ZS5wYXJ0cy5tYXAoKHBhcnQsIGkpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0X2NoYW5nZWQoaSwgc2VnbWVudCwgbWF0Y2gsIHN0cmluZ2lmaWVkX3F1ZXJ5KSlcclxuICAgICAgICAgICAgICAgICAgICBzZWdtZW50X2RpcnR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHByb3BzLnNlZ21lbnRzW2xdID0gc2VnbWVudHNbaSArIDFdOyAvLyBUT0RPIG1ha2UgdGhpcyBsZXNzIGNvbmZ1c2luZ1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwYXJ0KVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHNlZ21lbnQgfTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGogPSBsKys7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXNlc3Npb25fZGlydHkgJiYgIXNlZ21lbnRfZGlydHkgJiYgY3VycmVudF9icmFuY2hbaV0gJiYgY3VycmVudF9icmFuY2hbaV0ucGFydCA9PT0gcGFydC5pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRfYnJhbmNoW2ldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2VnbWVudF9kaXJ0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeyBkZWZhdWx0OiBjb21wb25lbnQsIHByZWxvYWQgfSA9IHlpZWxkIGxvYWRfY29tcG9uZW50KGNvbXBvbmVudHNbcGFydC5pXSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJlbG9hZGVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlYWR5IHx8ICFpbml0aWFsX2RhdGEucHJlbG9hZGVkW2kgKyAxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByZWxvYWRlZCA9IHByZWxvYWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyB5aWVsZCBwcmVsb2FkLmNhbGwocHJlbG9hZF9jb250ZXh0LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0OiBwYWdlLmhvc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYWdlLnBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeTogcGFnZS5xdWVyeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogcGFydC5wYXJhbXMgPyBwYXJ0LnBhcmFtcyhkZXN0Lm1hdGNoKSA6IHt9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICRzZXNzaW9uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJlbG9hZGVkID0gaW5pdGlhbF9kYXRhLnByZWxvYWRlZFtpICsgMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKHByb3BzW2BsZXZlbCR7an1gXSA9IHsgY29tcG9uZW50LCBwcm9wczogcHJlbG9hZGVkLCBzZWdtZW50LCBtYXRjaCwgcGFydDogcGFydC5pIH0pO1xyXG4gICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgcHJvcHMuZXJyb3IgPSBlcnJvcjtcclxuICAgICAgICAgICAgcHJvcHMuc3RhdHVzID0gNTAwO1xyXG4gICAgICAgICAgICBicmFuY2ggPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgcmVkaXJlY3QsIHByb3BzLCBicmFuY2ggfTtcclxuICAgIH0pO1xyXG59XHJcbmZ1bmN0aW9uIGxvYWRfY29tcG9uZW50KGNvbXBvbmVudCkge1xyXG4gICAgY29uc3QgcHJvbWlzZXMgPSBbY29tcG9uZW50LmpzKCldO1xyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKHZhbHVlcyA9PiB2YWx1ZXNbMF0pO1xyXG59XG5cbmZ1bmN0aW9uIHByZWZldGNoUm91dGVzKHBhdGhuYW1lcykge1xyXG4gICAgcmV0dXJuIHJvdXRlc1xyXG4gICAgICAgIC5maWx0ZXIocGF0aG5hbWVzXHJcbiAgICAgICAgPyByb3V0ZSA9PiBwYXRobmFtZXMuc29tZShwYXRobmFtZSA9PiByb3V0ZS5wYXR0ZXJuLnRlc3QocGF0aG5hbWUpKVxyXG4gICAgICAgIDogKCkgPT4gdHJ1ZSlcclxuICAgICAgICAucmVkdWNlKChwcm9taXNlLCByb3V0ZSkgPT4gcHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwocm91dGUucGFydHMubWFwKHBhcnQgPT4gcGFydCAmJiBsb2FkX2NvbXBvbmVudChjb21wb25lbnRzW3BhcnQuaV0pKSk7XHJcbiAgICB9KSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xyXG59XG5cbmNvbnN0IHN0b3JlcyQxID0gKCkgPT4gZ2V0Q29udGV4dChDT05URVhUX0tFWSk7XG5cbmV4cG9ydCB7IGdvdG8sIHByZWZldGNoLCBwcmVmZXRjaFJvdXRlcywgc3RhcnQsIHN0b3JlcyQxIGFzIHN0b3JlcyB9O1xuIiwiaW1wb3J0ICogYXMgc2FwcGVyIGZyb20gJ0BzYXBwZXIvYXBwJztcblxuc2FwcGVyLnN0YXJ0KHtcblx0dGFyZ2V0OiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2FwcGVyJylcbn0pOyJdLCJuYW1lcyI6WyJpbml0IiwiRXJyb3JDb21wb25lbnQiLCJyb290X2NvbXAucHJlbG9hZCIsInNhcHBlci5zdGFydCJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxJQUFJLEdBQUcsR0FBRztBQUVuQixTQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQzFCO0FBQ0EsSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUc7QUFDdkIsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxD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QVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RixDQUFDO0FBQ0QsU0FBUyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRTtBQUNsQyxJQUFJLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN6QixDQUFDO0FBQ0QsU0FBUyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7QUFDMUMsSUFBSSxZQUFZLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDOUQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBQ0QsU0FBUyxVQUFVLENBQUMsSUFBSSxFQUFFO0FBQzFCLElBQUksWUFBWSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM5QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqQixDQUFDO0FBNkJELFNBQVMsUUFBUSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFO0FBQzFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDakMsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJO0FBQ3JCLFFBQVEsWUFBWSxDQUFDLDBCQUEwQixFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDdEU7QUFDQSxRQUFRLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUMxRSxDQUFDO0FBU0QsU0FBUyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNsQyxJQUFJLElBQUks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
