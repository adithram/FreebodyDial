"use strict";

var LineConstants = {
    POINT_A_STRING : 'a',
    POINT_B_STRING : 'b',
    BOTH_POINTS    : 'both'
};
Object.freeze(LineConstants);

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
            return LineConstants.POINT_A_STRING;
        }
        if (Vector.in_bounds(cursor_pos, m_move_point_b)) {
            m_update_control_point_func = update_point_b;
            return LineConstants.POINT_B_STRING;
        }
        if (Vector.in_bounds(cursor_pos, m_move_whole_line)) {
            m_update_control_point_func = update_both_points;
            return LineConstants.BOTH_POINTS;
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

    /**************************************************************************
                              Line (Private Members)
                              (One line or undefined)
    **************************************************************************/
    
    var m_point_a = zero_vect();
    var m_point_b = zero_vect();
    var m_control_points = undefined;
    var m_handle_cursor_move_func  = undefined;
    var m_handle_cursor_click_func = undefined;
    
    /**************************************************************************
                              Line Editing (Private)
    **************************************************************************/
    
    var handle_cursor_move_editing = function(cursor_obj) {
        var cursor_pos = cursor_obj.location();
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
    
    var handle_cursor_click_editing = function(cursor_obj) {
        var cursor_pos = cursor_obj.location(), pressed = cursor_obj.is_pressed();
        return m_control_points.handle_cursor_click(cursor_pos, pressed);
    };
    
    /**************************************************************************
                           Line Initial Drawing (Private)
                              Put in place on creation
    **************************************************************************/

    m_handle_cursor_click_func = function(cursor_obj) {
        if (cursor_obj.is_pressed()) {
            m_point_b = m_point_a = cursor_obj.location();
        } else {
            m_handle_cursor_click_func = m_handle_cursor_move_func = 
                function(o){};
        }
    };

    m_handle_cursor_move_func = function(cursor_obj) {
        m_point_b = cursor_obj.location();
    };

    /**************************************************************************
                                  Line Editing
    **************************************************************************/

    this.enable_editing = function() { 
        this.highlight();
        m_handle_cursor_move_func  = handle_cursor_move_editing ;
        m_handle_cursor_click_func = handle_cursor_click_editing;
    }
    
    this.disable_editing = function() { 
        m_control_points = undefined; 
        m_handle_cursor_move_func  = function(c) {};
        m_handle_cursor_click_func = function(c, p) { return ''; };
    }
    
    this.highlight = function() {
        m_control_points = new LineControlPoints(m_point_a, m_point_b); 
    }
    
    this.unhighlight = function() { 
        m_control_points = undefined;
    }

    /**************************************************************************
                               Grouping Functions
    **************************************************************************/
    
    this.explode = function() { return this; }
    
    /**************************************************************************
                                 Cursor Events
    **************************************************************************/
    
    /** Called on state change
     *  @return Returns a string characterizing the effect of the click event,
     *          '' for no effect.
     */
    this.handle_cursor_click = function(cursor_pos, pressed) {
        return m_handle_cursor_click_func(cursor_pos, pressed);
    }
    
    /** Called when there is no change to the is_clicked event
     */
    this.handle_cursor_move = function(cursor_pos, pressed) {
        m_handle_cursor_move_func(cursor_pos); 
    }
    
    /**************************************************************************
                                 Other \_o.o_/
    **************************************************************************/

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

    this.finished_creating = function() { return true; }

    /** While the Line is being pulled (as part of its creation) or edited;
     *  snap_to_guideline will add a snapping effect allowing for more 
     *  consistent diagrams.
     *  
     *  @param guide_line {Vector} A unit vector, representing a line, which 
     *                             this line will snap to.
     *  @param rads       {number} The snapping thershold in radians.
     */
    // :WARNING: I AM going to change how this works!
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
} // end of Line
