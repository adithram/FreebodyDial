/*******************************************************************************
 * 
 * Notes on Reading:
 * 
 * JavaScript has no notion of 'forwarding', therefore it maybe better to read
 * the source file from the bottom up. That is from the last "Object 
 * declatation" to the first and then utils.
 * 
 ******************************************************************************/

"use strict";

// on reflection: I perhaps should've used a geometry library as opposed to 
//                reinventing the wheel, and wasting time

var assert_new = {
    global_this : this,
    check : function(this_) {
        if (this_ === this.global_this)
            throw "You must use \"new\" to create new objects.";
    }
};

Object.freeze(assert_new);

function assert_not_nan(f) { if (f != f) throw "Nan!"; }

function array_last(arr) { return arr[arr.length - 1]; }

function array_clean(arr) {
    var rv = [];
    for_each(arr, function(entry) {
        if (entry)
            rv.push(entry);
    });
    return rv;
};

function array_trim(arr, condition) {
    var modify_array = function(arr) { return arr };
    for (var i = 0; i < arr.length; ++i) {
        if (condition(arr[i])) {
            delete arr[i];
            modify_array = array_clean;
        }
    }
    return modify_array(arr);
}

function array_trim_first(arr, condition) {
    // DRY violation, but how can I cleanly avoid this here?
    var modify_array = function(arr) { return arr };
    for (var i = 0; i < arr.length; ++i) {
        if (condition(arr[i])) {
            delete arr[i];
            modify_array = array_clean;
            break;
        }
    }
    return modify_array(arr);
}

var Vector = {
    mag : function(v) {
        return Math.sqrt(v.x*v.x + v.y*v.y);
    },
    angle_between : function(u, v) {
        var dot_prod = u.x*v.x + u.y*v.y;
        return Math.acos(dot_prod/(this.mag(u)*this.mag(v)));
    },
    to_string : function(v) {
        return "(x: " + v.x + " y: " + v.y + " )";
    },
    norm : function(v) {
        return { x: v.x/this.mag(v), y: v.y/this.mag(v) };
    },
    add : function(v, u) {
        return { x: v.x + u.x, y: v.y + u.y };
    },
    sub : function(v, u) {
        return { x: v.x - u.x, y: v.y - u.y };
    },
    in_bounds : function(v, bounds) {
        return v.x > bounds.x && v.x < bounds.x + bounds.width &&
               v.y > bounds.y && v.y < bounds.y + bounds.height;
    },
    bounds_around : function(point, size_vect) {
        return { x: point.x - size_vect.x/2, 
                 y: point.y - size_vect.y/2,
                 width : size_vect.x, 
                 height: size_vect.y };
    },
    distance : function(u, v) { return this.mag(this.sub(u, v)); }
}

Object.freeze(Vector);

var g_this = this;

function zero_vect() { return { x: 0, y: 0 }; }

function deepcopy(obj) { return $.extend(true, {}, obj); }

function draw_bounds_as_black_outlined_box(context, cp_bounds, fill_color) {
    context.beginPath();
    context.rect(cp_bounds.x, cp_bounds.y, cp_bounds.width, cp_bounds.height);
    context.fillStyle = fill_color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = 'black';
    context.stroke();
}

function for_each(array, callback) {
    for (var i = 0; i < array.length; ++i) {
        var wants_break = callback(array[i]);
        if (wants_break !== undefined) {
            if (wants_break === true)
                return;
        }
    }
}

/** The set of small boxes, which allows the user to edit a Line primative.
 *  It can also be used to merely highlight a line (for now).
 *  @note This type is not meant to be used with any other expect for Line.
 */
function LineControlPoints(point_a, point_b) {
    assert_new.check(this);
    
    // style note: these "declarations" doesn't create any members,
    //             this is more of an FYI: "these are the names for these
    //             things which are created in the future"
    var m_move_point_a = undefined;
    var m_move_point_b = undefined;
    var m_move_whole_line = undefined;
    var m_update_control_point_func = undefined;
    
    function point_size() { return 10.0; }
    
    function bounds_around(point) {
        return Vector.bounds_around(point, { x: point_size(), y: point_size() });
    }
    
    function avg_vect(u, v) {
        return { x: (u.x + v.x)/2, y: (u.y + v.y)/2 };
    }
    
    function draw_point_bounds(context, cp_bounds, fill_color) {
        draw_bounds_as_black_outlined_box(context, cp_bounds, fill_color);
    }
    
    var update_point_a = function(cursor_pos) {
        m_move_point_a = bounds_around(cursor_pos);
        m_move_whole_line = bounds_around(avg_vect(cursor_pos, m_move_point_b));
        return { a: cursor_pos };
    };
    
    var update_point_b = function(cursor_pos) {
        m_move_point_b = bounds_around(cursor_pos);
        m_move_whole_line = bounds_around(avg_vect(m_move_point_a, cursor_pos));
        return { b: cursor_pos };
    };
    
    var update_both_points = function(cursor_pos) {
        var center_of = function(bounds) {
            return { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height/2 };
        };
        var cent = center_of(m_move_whole_line);
        var to_a = Vector.sub(center_of(m_move_point_a), cent);
        var to_b = Vector.sub(center_of(m_move_point_b), cent);
        
        m_move_whole_line = bounds_around(cursor_pos);
        var resp = { a: Vector.add(cursor_pos, to_a),
                     b: Vector.add(cursor_pos, to_b) };
        m_move_point_a = bounds_around(resp.a);
        m_move_point_b = bounds_around(resp.b);
        return resp;
    };
    
    this.draw = function(context) {
        draw_point_bounds(context, m_move_point_a   , 'yellow');
        draw_point_bounds(context, m_move_point_b   , 'yellow');
        draw_point_bounds(context, m_move_whole_line, 'blue'  );
    }
    
    /** Updates control point locations in accordance with which control point 
     *  is currently being dragged.
     *  @param cursor_pos {Vector}
     *  @return Returns an object optionally containing "a" and/or "b" 
     *          indicating new locations for the corresponding points for the 
     *          parent. (The parent is expected to modify its points to match.
     */
    this.handle_cursor_move = function(cursor_pos) {
        if (m_update_control_point_func === undefined) return {};
        return m_update_control_point_func(cursor_pos);
    }
    
    this.handle_cursor_click = function(cursor_pos, pressed) {
        if (!pressed) {
            m_update_control_point_func = undefined;
            return '';
        }
        if (Vector.in_bounds(cursor_pos, m_move_point_a)) {
            m_update_control_point_func = update_point_a;
            return 'a';
        }
        if (Vector.in_bounds(cursor_pos, m_move_point_b)) {
            m_update_control_point_func = update_point_b;
            return 'b';
        }
        if (Vector.in_bounds(cursor_pos, m_move_whole_line)) {
            m_update_control_point_func = update_both_points;
            return 'both';
        }
        return '';
    }
    
    this.is_editing_point_a = function()
        { return m_update_control_point_func === update_point_a; }
    
    this.is_editing_point_b = function()
        { return m_update_control_point_func === update_point_b; }
    
    this.set_points = function(point_a, point_b) {
        m_move_point_a = bounds_around(point_a);
        m_move_point_b = bounds_around(point_b);
        m_move_whole_line = bounds_around(avg_vect(point_a, point_b));
    }
    this.set_points(point_a, point_b);
}

// proposal: adding clickable 'widgets' on these diagram primatives
// allowing for movement, rotation grouping(?) and anything else we need
// though there is risk of crowding the interface

/** A Line is a diagram primative.
 * 
 *  The interface has creation/editing functions.
 *  Soon to be grouping functions, is there a way to prevent the interface
 *  from becoming too bloated?
 *  @note client code should not concern itself with what is "point a" and what
 *        is "point b".
 */
function Line() {
    assert_new.check(this);

    var m_point_a = zero_vect();
    var m_point_b = zero_vect();
    var m_control_points = undefined;
    
    var m_handle_cursor_move_func  = undefined;
    var m_handle_cursor_click_func = undefined;
    
    var handle_cursor_move_editing = function(cursor_pos) {
        var gv = m_control_points.handle_cursor_move(cursor_pos);
        var rv = false;
        if (gv.a !== undefined) {
            m_point_a = gv.a;
            rv = true;
        }
        if (gv.b !== undefined) {
            m_point_b = gv.b;
            rv = true;
        }
        return rv;
    };
    
    var handle_cursor_click_editing = function(cursor_pos, pressed) {
        m_control_points.handle_cursor_click(cursor_pos, pressed);
    };
    
    /**************************************************************************
                                  Line Creation
    **************************************************************************/

    this.set_at = function(v) { m_point_b = m_point_a = v; }

    this.pull = function(v) { m_point_b = v; }
    
    /** While the Line is being pulled (as part of its creation) or edited;
     *  snap_to_guideline will add a snapping effect allowing for more 
     *  consistent diagrams.
     *  @param guide_line {Vector} A unit vector, representing a line, which 
     *                             this line will snap to.
     *  @param rads       {number} The snapping thershold in radians.
     */
    this.snap_to_guideline = function(guide_line, rads) {
        var diff = { x: m_point_a.x - m_point_b.x, 
                     y: m_point_a.y - m_point_b.y };
        var error_con = 0.005;
        var ang_bet = Vector.angle_between(diff, guide_line);
        var scalar = 0;
        
        var angle_diff = Math.abs(rads - ang_bet);
        if (angle_diff > error_con && angle_diff < rads)
            scalar = 1;

        angle_diff = Math.abs(Math.PI - rads - ang_bet);
        if (angle_diff > error_con && angle_diff < rads)
            scalar = -1;
        
        if (scalar === 0) {
            return false;
        }
        // make the snap
        var saved_mag = Vector.mag(diff);
        var to_other_point = { x: saved_mag*scalar*guide_line.x,
                               y: saved_mag*scalar*guide_line.y };
        
        var comp_new_pt_b = function() {
            return { x: -to_other_point.x + m_point_a.x,
                     y: -to_other_point.y + m_point_a.y };
        };
        
        if (m_control_points === undefined) {
            // snap which ever point is being pulled in this case point b
            m_point_b = comp_new_pt_b();
        } else {
            if (m_control_points.is_editing_point_a()) {
                m_point_a = { x: to_other_point.x + m_point_b.x,
                              y: to_other_point.y + m_point_b.y };;
            } else if (m_control_points.is_editing_point_b()) {
                m_point_b = comp_new_pt_b();
            } else {
                // both are being edited, therefore do no snapping
            }
            m_control_points.set_points(m_point_a, m_point_b);
        }
        
        return true;
    }
        
    /**************************************************************************
                                  Line Editing
    **************************************************************************/

    this.enable_editing = function() { 
        this.show_control_points();
        m_handle_cursor_move_func  = handle_cursor_move_editing ;
        m_handle_cursor_click_func = handle_cursor_click_editing;
    }
    
    this.disable_editing = function() { 
        m_control_points = undefined; 
        m_handle_cursor_move_func  = function(c) {};
        m_handle_cursor_click_func = function(c, p) { return false; };
    }
    this.disable_editing();
    
    this.show_control_points = function() {
        m_control_points = new LineControlPoints(m_point_a, m_point_b); 
    }
    
    this.hide_control_points = function() 
        { this.disable_editing(); }

    this.handle_cursor_move = function(cursor_pos) 
        { m_handle_cursor_move_func(cursor_pos); }
    
    this.explode = function() { return this; }
    
    this.point_within = function(point, distance_limit) {
        // Geometry, derived from mathematics:
        // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
        if (distance_limit === undefined)
            throw "distance_limit must be defined";
        
        var a = m_point_a;
        var b = m_point_b;
        var c = point;
        var xs_diff_sq = (a.x - b.x)*(a.x - b.x);
        var ys_diff_sq = (a.y - b.y)*(a.y - b.y);
        
        // Prevent NaN
        if (xs_diff_sq === 0 && ys_diff_sq === 0)
            return Vector.distance(c, a) <= distance_limit; 
        
        var dist = Math.abs((b.y - a.y)*c.x - (b.x - a.x)*c.y + b.x*a.y - b.y*a.x)/
                   Math.sqrt(xs_diff_sq + ys_diff_sq);
        return (dist <= distance_limit);
    }
    
    /**
     *  @return Returns true if the click modified the object, false otherwise.
     */
    this.handle_cursor_click = function(cursor_pos, pressed) 
        { return m_handle_cursor_click_func(cursor_pos, pressed); }
    
    this.draw = function(context) {
        context.beginPath();
        context.moveTo(m_point_a.x, m_point_a.y);
        context.lineTo(m_point_b.x, m_point_b.y);
        context.lineWidth = 5;
        context.stroke();

        if (m_control_points !== undefined)
            m_control_points.draw(context);
    }
    
    this.bounds = function() { 
        var x_ = Math.min(m_point_a.x, m_point_b.x);
        var y_ = Math.min(m_point_a.y, m_point_b.y);
        return { x: x_, y: y_, 
                 width : Math.abs(m_point_a.x - m_point_b.x),
                 height: Math.abs(m_point_a.y - m_point_b.y) };
    }
}

function RectangularControlPoints(top_left, bottom_right) {
    assert_new.check(this);
    
    var m_bounds_points = [top_left    , { x: bottom_right.x, y: top_left.y },
                           bottom_right, { x: top_left.x, y: bottom_right.y }];
    var m_move_point = { x: (top_left.x + bottom_right.x)/2,
                         y: (top_left.y + bottom_right.y)/2 };
    
    function point_size() { return 10.0; }
    
    function bounds_around(point) {
        return Vector.bounds_around(point, { x: point_size(), y: point_size() });
    }
    function draw_bounds(context, cp_bounds, fill_color) {
        draw_bounds_as_black_outlined_box(context, cp_bounds, fill_color);
    }
    this.draw = function(context) {
        for_each(m_bounds_points, function(bounds_point) {
            draw_bounds(context, bounds_around(bounds_point), 'yellow');
        });
        draw_bounds(context, bounds_around(m_move_point), 'blue');
    }
}

function Group(sub_items) {
    assert_new.check(this);
    
    var m_sub_items      = sub_items;
    var m_top_left       = undefined;
    var m_bottom_right   = undefined;
    var m_control_points = undefined;
    
    var for_init_compute_bounds_around_array = function(items) {
        var top_left_most     = { x:  Infinity, y:  Infinity };
        var bottom_right_most = { x: -Infinity, y: -Infinity };
        for_each(items, function(item) {
            var bounds_ = item.bounds();
            top_left_most.x = Math.min(top_left_most.x, bounds_.x);
            top_left_most.y = Math.min(top_left_most.y, bounds_.y);
            var right = bounds_.x + bounds_.width;
            var bottom = bounds_.y + bounds_.height;
            bottom_right_most.x = Math.max(bottom_right_most.x, right );
            bottom_right_most.y = Math.max(bottom_right_most.y, bottom);
        });
        m_top_left     = top_left_most;
        m_bottom_right = bottom_right_most;
    }
    for_init_compute_bounds_around_array(sub_items);
    for_init_compute_bounds_around_array = undefined;
    
    this.show_control_points = function() {
        m_control_points = 
            new RectangularControlPoints(m_top_left, m_bottom_right);
    }
    
    this.hide_control_points = function() {
        m_control_points = undefined;
    }
    
    this.point_within = function(point, distance_limit) {
        if (Vector.in_bounds(point, this.bounds())) return true;
        var dist = Math.min( Math.abs(m_top_left.x     - point.x),
                             Math.abs(m_top_left.y     - point.y),
                             Math.abs(m_bottom_right.x - point.x),
                             Math.abs(m_bottom_right.x - point.x) );
        return (dist <= distance_limit);
    }
    
    this.explode = function() {
        return m_sub_items;
    }
    
    this.draw = function(context) { 
        for_each(m_sub_items, function(item) { item.draw(context); });
        if (m_control_points === undefined) return;
        m_control_points.draw(context);
    }
    
    this.bounds = function() {
        return { x: m_top_left.x, y: m_top_left.y,
                 width : m_bottom_right.x - m_top_left.x,
                 height: m_bottom_right.y - m_top_left.y };
    }
}

/** Represents a 'quick and dirty' menu. For prototyping purposes. Hopefully
 *  we can use HTML to create a more professional interface.
 * 
 */
function BarMenu() {
    assert_new.check(this);
    
    var m_entries = [];
    // will have to be constant relative to the diagram
    var m_location = zero_vect();
    var m_size     = zero_vect();
    
    this.push_entry = function(text_, callback_) {
        m_entries.push({ text: text_, callback: callback_ });
    }
    
    this.check_click = function(cursor) {
        if (m_entries.length === 0) return false;
        if (m_entries[0].bounds === undefined) return false;
        var rv = false;
        for_each(m_entries, function(entry) {
            // ... reinventing the wheel?
            if (Vector.in_bounds(cursor, entry.bounds)) {
                entry.callback();
                rv = true;
                return true;
            }
        });
        return rv;
    }
    
    // I wish I could do this with regular HTML elements, it would be soooo
    // much easier and allow fancier graphics
    // this function DOES modify the state of the object
    this.draw = function(context) {
        var draw_position = deepcopy(m_location);
        
        m_size = zero_vect();
        context.font = "28px Arial";
        context.lineWidth = 1;
        context.strokeStyle = 'black';
        context.fillStyle = 'black';
        for_each(m_entries, function(entry) {
            var entry_size = { x: context.measureText(entry.text).width,
                               y: parseInt(context.font) };
            // update entry bounds
            entry.bounds = { x    : draw_position.x, y     : draw_position.y,
                             width: entry_size.x   , height: entry_size.y    };
            
            // draw box around entry
            context.beginPath();
            context.rect(draw_position.x, draw_position.y, entry_size.x, entry_size.y);
            context.stroke();
            
            // entry text
            context.fillText(entry.text, draw_position.x, draw_position.y + entry_size.y)
            
            m_size.x += entry_size.x;
            draw_position.x += entry_size.x;
        });
        
    }
}

/** The 'Cursor' Object is the actual Controller (due for renaming?). Other 
 *  'controllers' keep track of events that occur in the program, and then 
 *  updates this object.
 * 
 *  Not to be confused with the mouse cursor. The cursor is an abstraction; it 
 *  is the point on screen which may receive click events. Its location may 
 *  convey user will.
 * 
 *  @note user will -> as in user will so far as we can ascertain from input 
 *        json/mouse/keyboard or otherwise
 */
function Cursor() {
    assert_new.check(this);
    
    var m_min_speed           = 200;
    var m_max_dbl_click_delay = 0.1;
    
    var m_cursor_location  = zero_vect();
    var m_cursor_direction = zero_vect();
    var m_cursor_velocity  = zero_vect();
    
    var m_time_since_previous_click = 0;
    var m_click_was_held = false; // history
    var m_click_held = false;
    
    var m_location_change_event = undefined;
    var m_just_clicked_event    = undefined;
    var m_just_released_event   = undefined;
    var m_click_held_event      = undefined;
    var m_double_click_event    = undefined;
    
    var throw_if_param_not_func = function(func) {
        if (!$.isFunction(func))
            throw "func parameter must be a function";
    }
    
    this.location = function() { return m_cursor_location; }
    
    this.is_pressed = function() { return m_click_held; }
    
    this.set_location = function(v) {
        m_cursor_location = v;
        if (m_location_change_event !== undefined)
            m_location_change_event();
    }
    
    this.move_in_direction = function(dir) {
        m_cursor_direction = dir;
    }
    
    this.set_pressed = function(pressed) {
        m_click_was_held = m_click_held;
        m_click_held     = pressed     ;
        if (m_click_held && m_click_was_held) {
            m_click_held_event();
        } else if (m_click_held && !m_click_was_held) {
            m_just_clicked_event();
        } else if (!m_click_held && m_click_was_held) {
            m_just_released_event();
        }
    }
    
    this.do_time_based_updates = function(et) {
        // for move controls
        var mul   = function(s, v) { return { x:s*v.x, y:s*v.y }; };
        var add   = Vector.add;
        var addeq = function(v, u) { v = Vector.add(v, u); };
        var mag   = Vector.mag;
        var norm  = Vector.norm;

        if (mag(m_cursor_direction) !== 0) {
            // perhaps add an accelerating cursor?
            addeq(m_cursor_location, mul(m_min_speed*et, m_cursor_direction));
            m_cursor_direction = zero_vect();
            m_location_change_event();
        }
        
        if (m_click_held && m_click_was_held)
            m_click_held_event();
    }
    
    this.reset_events = function() {
        m_location_change_event = function(){};
        m_just_clicked_event    = function(){};
        m_just_released_event   = function(){};
        m_click_held_event      = function(){};
        m_double_click_event    = function(){};
    }
    this.reset_events();
    
    this.set_location_change_event = function(func) { 
        throw_if_param_not_func(func);
        m_location_change_event = func; 
    }
    
    this.set_just_clicked_event = function(func) {
        throw_if_param_not_func(func);
        m_just_clicked_event = func;
    }
    
    this.set_click_held_event = function(func) {
        throw_if_param_not_func(func);
        m_click_held_event = func;
    }
    
    this.set_just_released_event = function(func) {
        throw_if_param_not_func(func);
        m_just_released_event = func; 
    }
    
    this.set_double_click_event = function(func) {
        throw_if_param_not_func(func);
        m_double_click_event = func;
    }
}

/** The 'M' in MVC; represents the program's state.
 *  
 *  Right now the program is comprised only of lines, a menu, and hopefully 
 *  soon groups.
 * 
 *  @note Implementing an undo feature maybe tricky, perhaps we could use 
 *        function closures to represent the inverse of user actions, and stack
 *        them onto an Array, and pop and execute as needed.
 */
function Model(cursor) {
    assert_new.check(this);

    var m_cursor_ref = cursor;

    var m_lines = [];
    var m_guidelines = [{ x: 1, y: 0 }, { x: 0, y: 1 }, Vector.norm({ x: 3, y: 1 }) ];
    
    var m_bar_menu = new BarMenu();
    var m_is_drawing = true;
    
    var m_cursor_box = undefined;
    var self = this;
    
    m_bar_menu.push_entry("Edit", function() {
        for_each(m_lines, function(line) {
            line.enable_editing();
        });
        m_is_drawing = false;
        console.log("edit");
        self.change_to_draw_mode(m_cursor_ref);
    });
    
    m_bar_menu.push_entry("Draw", function() {
        for_each(m_lines, function(line) {
            line.disable_editing();
        });
        m_is_drawing = true;
        console.log("draw");
        self.change_to_draw_mode(m_cursor_ref);
    });
    
    var m_candidate_group = undefined;
    var m_groups = [];
    m_bar_menu.push_entry("Group", function() {
        var cursor = m_cursor_ref;
        m_candidate_group = [];
        cursor.reset_events();
        cursor.set_just_released_event(function() {
            m_bar_menu.check_click(cursor.location());
            // uniform interface, perhaps there should only be one array for 
            // the model?
            // DRY violation
            m_lines = array_trim_first(m_lines, function(line) {
                var rv = undefined;
                if ( (rv = line.point_within(cursor.location(), 10)) ) {
                    line.show_control_points();
                    m_candidate_group.push(line);
                }
                return rv;
            });
            m_groups = array_trim_first(m_groups, function(group) {
                var rv = undefined;
                if ( (rv = group.point_within(cursor.location(), 10)) ) {
                    group.show_control_points();
                    m_candidate_group.push(group);
                }
                return rv;
            });
        });
    });
    
    m_bar_menu.push_entry("Ungroup", function() {
        var cursor = m_cursor_ref;
        // ass convuluted...
        if (m_candidate_group !== undefined) {
            m_groups.push(new Group(m_candidate_group));
            m_candidate_group = undefined;
        }
        cursor.reset_events();
        cursor.set_just_released_event(function() {
            m_bar_menu.check_click(cursor.location());
            // again another DRY violation
            // however this is a POC for this 'uniform' interface 
            // (no not really inheritance, yes closer to concepts)
            var ungrouped_items = undefined;
            var handle_ungrouped_items = function(items) {
                if (Array.isArray(items)) {
                    // this is why I want just one primatives array
                    for_each(items, function(item) {
                        if (item instanceof Line)
                            m_lines.push(item);
                        else
                            m_groups.push(item);
                    });
                } else {
                    var item = items; // items, there is actually one (a Line)
                    m_lines.push(item);
                }
            };
            m_lines = array_trim_first(m_lines, function(line) {
                var rv = undefined;
                if ( (rv = line.point_within(cursor.location(), 10)) )
                    ungrouped_items = line.explode();
                return rv;
            });
            handle_ungrouped_items(ungrouped_items);
            m_groups = array_trim_first(m_groups, function(group) {
                var rv = undefined;
                if ( (rv = line.point_within(cursor.location(), 10)) )
                    ungrouped_items = group.explode();
                return rv;
            });
            handle_ungrouped_items(ungrouped_items);
        });
        
    });
    
    this.change_to_draw_mode = function(cursor) {
        
        cursor.set_just_clicked_event(function() {
            m_bar_menu.check_click(cursor.location());
            if (!m_is_drawing) return;
            m_lines.push(new Line());
            array_last(m_lines).set_at(cursor.location());
        });
        
        cursor.set_just_released_event(function() {
            if (m_lines.length === 0) return;
            for_each(m_guidelines, function(guideline) {
                array_last(m_lines).snap_to_guideline(guideline, Math.PI/32);
            });
            
            m_lines = array_trim(m_lines, function(line) {
                var bounds = line.bounds();
                return (bounds.width < 10.0 && bounds.height < 10.0);
            });
        });
        
        cursor.set_click_held_event(function() {
            if (m_is_drawing) {
                // this is a continuous 'event'
                // it is called on each time based update iff the cursor was 
                // pressed on this and the previous frame
                array_last(m_lines).pull(cursor.location());
            }
            if (m_lines.length !== 0) {
                for_each(m_guidelines, function(guideline) {
                    array_last(m_lines).snap_to_guideline(guideline, Math.PI/32);
                });
            }
        });
        
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around
                (cursor.location(), { x: 10, y: 10 });
            
            for_each(m_lines, function(line) {
                line.handle_cursor_move(cursor.location());
            });
            if (m_lines.length !== 0) {
                for_each(m_guidelines, function(guideline) {
                    array_last(m_lines).snap_to_guideline(guideline, Math.PI/32);
                });
            }
            for_each(m_lines, function(line) {
                // kind of tricky, the for each loop breaks if true is returned
                // line.handle_cursor_click returns true when the line has been
                // modified by the event
                line.handle_cursor_click(cursor.location(), cursor.is_pressed());
            });
        });
    }

    
    this.render_to = function(view) {
        // view is a draw context object
        view.fillStyle = "#000";
        view.fillRect(m_cursor_box.x    , m_cursor_box.y,
                      m_cursor_box.width, m_cursor_box.height);

        for_each(m_lines, function(line) { line.draw(view); });
        if (m_candidate_group !== undefined) {
            for_each(m_candidate_group, function(primitive) { primitive.draw(view); });
        }

        m_bar_menu.draw(view);
    }
}


function KeyboardController() {
    assert_new.check(this);
    var m_keys_down = {};
    this.update_cursor = function(cursor, et) {
        var x_dir = 0;
        var y_dir = 0;
        if (37 in m_keys_down) { // left
            x_dir = -1;
        } else if (39 in m_keys_down) { // right
            x_dir =  1;
        }
        if (38 in m_keys_down) { // up
            y_dir = -1;
        } else if (40 in m_keys_down) { // down
            y_dir =  1;
        }
        // normalize the input
        if (x_dir !== 0 && y_dir !== 0) {
            x_dir /= Math.sqrt(2);
            y_dir /= Math.sqrt(2);
        }
        cursor.move_in_direction({ x : x_dir, y : y_dir });
    }
    this.update_key_press = function(keycode)
        { m_keys_down[keycode] = true; }
    this.update_key_release = function(keycode)
        { delete m_keys_down[keycode]; }
}

function MouseController() {
    assert_new.check(this);
    var m_mouse_location = zero_vect();
    var m_mouse_pressed = false;
    this.update_location = function(loc) {
        loc.x -= 10;
        loc.y -= 10;
        m_mouse_location = loc;
    }
    this.update_cursor = function(cursor, et) {
        cursor.set_pressed (m_mouse_pressed );
        cursor.set_location(m_mouse_location);
    }
    this.mouse_click = function(pressed) {
        m_mouse_pressed = pressed;
    }
}

/** The JSON controller (due for renaming?), 
 * 
 */
function JsonController() {
    assert_new.check(this);
    var m_direction = zero_vect();
    var m_click     = false;

    this.read_json = function(obj) {
        if (obj === undefined) return;
        if (obj.x !== undefined)
            m_direction.x = obj.x;
        if (obj.y !== undefined)
            m_direction.y = obj.y;
        if (obj.click_held !== undefined)
            m_click = obj.click_held;
    }
    this.update_cursor = function(cursor, et) {
        cursor.set_pressed      (m_click    );
        cursor.move_in_direction(m_direction);
    }
}

/** The App Object represents the entire MVC as a single object.
 *  This object maps JavaScript events to their respective controllers, which
 *  manipulate the state.
 * 
 *  The App has two self-perpetuating events. The update/frame time event. This
 *  currently occurs every 50ms, and can be configured as needed. The JSON 
 *  listener (currently disabled) will query a path on the server looking for
 *  input information. This JSON object indicates a state change (not the 
 *  current state) of the dial control. So, an empty body will mean 'no change',
 *  where as a JSON object defining only x, would mean that the user has 
 *  changed the dial's x axis only.
 */
function App() {
    assert_new.check(this);

    /**************************************************************************
                                  Private Members
    **************************************************************************/
    var m_context;
    var m_canvas;
    var m_time_then = Date.now();
    var m_keyboard_controller = new KeyboardController();
    var m_mouse_controller = new MouseController();
    var m_json_controller = undefined;//new JsonController();
    var m_controllers = [m_keyboard_controller, m_mouse_controller];
    
    
    // "Backend" controller
    var m_cursor = new Cursor();
    var m_model = new Model(m_cursor);

    var m_json_target;
    var m_update_counter = 0; // necessary for my machine
    var m_pause = false;

    /**************************************************************************
                                  Private Methods
    **************************************************************************/
    function run() {
        var now   = Date.now();
        var delta = now - m_time_then;
        if (!m_pause) {
            update(delta / 1000);
            render();
        }
        // there maybe latency and network problems (spamming the network with
        // packet); perhaps 60 packets/s isn't much?
        //
        // on local machines, latency is unnoticable
        // the same for the most part on local network
        // I have noticed there are times where the script will wait for long
        // periods of time (1/10th of a second or so) for a response from the
        // server, producing jumpy like behavior on the page
        if (m_update_counter === 3) {
            //listen();
            m_update_counter = 0;
        } else {
            ++m_update_counter;
        }
        m_time_then = now;
        setTimeout(requestAnimationFrame(run), 100);
    }

    /** Update routine, this is called once per frame.
     *  @param {Number} et Elapsed time in seconds.
     */
    function update(et) {
        for_each(m_controllers, function(controller) {
            controller.update_cursor(m_cursor, et);
        });
        m_cursor.do_time_based_updates(et);
    }

    function render() {
        // clear screen
        m_context.fillStyle = "#FFF";
        m_context.fillRect(0, 0, m_canvas.width, m_canvas.height);
        // context and canvas used here
        m_model.render_to(m_context);
    }

    function listen() {
        // if undefined is provided for the url, jquery will try to load
        // the canvas page as the json file!
        if (m_json_target === undefined) return;

        /* we could ask the server if there's an update
         * oh god ajax is blocking, we'll have to find an asynchronous way to
         * do the listen */
        $.ajax({
            type    : "POST",
            url     : m_json_target,
            success : function(data) { m_json_controller.read_json(data); },
            error   : function(XMLHttpRequest, textStatus, errorThrown) {},
            // just some things I've learned about json and the server
            // it maybe neccessary that the server provides the json mime type
            // in the HTTP header
            dataType: "json"
        });
    }

    this.set_canvas_and_run = function(html_id_str) {
        m_canvas  = document.getElementById(html_id_str);
        m_context = m_canvas.getContext("2d", { alpha: false, depth: false });
        // anything else to start up

        m_model.change_to_draw_mode(m_cursor);
        // starts the app
        run();
    };

    this.key_press = function(code)
        { m_keyboard_controller.update_key_press(code); };

    this.key_release = function(code)
        { m_keyboard_controller.update_key_release(code); };

    this.mouse_move = function(loc)
        { m_mouse_controller.update_location(loc); }

    this.mouse_click = function()
        { m_mouse_controller.mouse_click(true ); }
    this.mouse_release = function()
        { m_mouse_controller.mouse_click(false); }

    this.set_listen_target = function(target_address) {
        m_json_target = target_address;
        m_json_controller = new JsonController();
        m_controllers.push(m_json_controller);
    }
    
    this.pause_execution  = function() { m_pause = true ; }
    this.resume_execution = function() { m_pause = false; }
}

var g_app;

// intending to modify global this
this.start_app = function() {
    g_app = new App();
    g_app.set_canvas_and_run("main-canvas");
}
