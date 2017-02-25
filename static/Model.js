"use strict";

(function(){
    // "concept checking"
    // must meet a "common interface"
    function find_missing_function(obj) {
        var required_functions = [
            "highlight", "unhighlight", "point_within",
            "explode", "draw", "bounds", "handle_cursor_click", 
            "handle_cursor_move", "enable_editing", "disable_editing"];
        var rv = "";
        for_each(required_functions, function(str) {
            if (obj[str] === undefined) {
                rv = str;
                return true;
            }
        });
        return rv;
    }
    function get_object_name(obj) {
        return (/^function(.{1,})\(/).exec(obj.constructor.toString())[1];
    }
    for_each([new Line(), new Group([])], function(obj) {
        var gv = find_missing_function(obj);
        if (gv !== "") {
            throw get_object_name(obj) + " does not have a required " + 
                  "function defined: \"" + gv + "\".";
        }
    });
}());

function Ellipse() {
    var m_radii = zero_vect();
    var m_location = zero_vect();
    this.set_location = function(x_, y_) { m_location = { x: x_, y: y_ }; }
    this.set_radii = function(x_, y_) { m_radii = { x: x_, y: y_ }; }
    this.draw = function(context) {
        // save state
        context.save();

        // scale context horizontally
        context.scale(m_radii.x, m_radii.y);

        // draw circle which will be stretched into an oval
        context.beginPath();
        context.arc(m_location.x, m_location.y, 1, 0, 2*Math.PI, false);

        // restore to original state
        context.restore();

        // apply styling
        context.fillStyle = 'white';
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = 'black';
        context.stroke();
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

/* --------- UNDO FUNCTION --------- */

// Potentially use sessions, stored as a list, to save previous user actions?
/*
1) User clicks on location to indicate line start point
2) User releases mouse to indicate line end point
3) Line stored in m_lines
4) All lines in m_lines rendered

In order to emulate the undo function...
1) Decrease the list size by 1? 
2) Re-render? 
*/
function Model(cursor) {
    assert_new.check(this);

    var m_cursor_ref = cursor;

    // weak references are not possible in JavaScript
    // I maybe stuck with type switching... (ew)
    // (perhaps in a new standard)
    var m_diagram_objects = [];
    var m_last_undone_object = undefined;
    
    // :WARNING: I AM going to change how this works!
    var m_guidelines = [{ x: 1, y: 0 }, { x: 0, y: 1 }, Vector.norm({ x: 3, y: 1 }) ];
    
    var m_bar_menu = new BarMenu();
    
    var m_cursor_box = undefined;
    var self = this; // some closures can't get to 'this', self is a fix for 'this'
        
    function for_each_line_in(array, func) {
        for_each(array, function(item) {
            if (item instanceof Line)
                return func(item);
        });
    }
    
    function assert_no_empties(array) {
        for_each(array, function(item) {
            if (item === undefined)
                throw "Array contains empties!";
        });
    }
    
    function cursor_box_size() { return { x: 10, y: 10 }; }
    
    function snap_last_object_to_guidelines() {
        if (m_diagram_objects.length === 0) return;
        for_each(m_guidelines, function(guideline) {
            // line specific
            var last = array_last(m_diagram_objects);
            if (last instanceof Line)
                last.snap_to_guideline(guideline, Math.PI/32);
        });
    }
    
    function delete_objects_too_small() {
        m_diagram_objects = array_trim(m_diagram_objects, function(object) {
            var bounds = object.bounds();
            return (bounds.width < 10.0 && bounds.height < 10.0);
        });
    }
    
    function change_to_draw_mode() {
        cursor.set_just_clicked_event(function() {
            // do not create a primitive if the menu captures the cursor's 
            // input
            if (m_bar_menu.check_click(cursor.location()))
                return;
            
            // we can now trade this for any primitive
            // Say an ellipse or polygon or Text
            m_diagram_objects.push(new Line());
            array_last(m_diagram_objects).handle_cursor_click(cursor.as_read_only());
        });
        
        cursor.set_just_released_event(function() {
            delete_objects_too_small();
            snap_last_object_to_guidelines();
            array_last(m_diagram_objects).handle_cursor_click(cursor.as_read_only());
        });
        
        cursor.set_click_held_event(function() {
            // this is a continuous 'event'
            // it is called on each time based update iff the cursor was 
            // pressed on this and the previous frame
            
            if (m_diagram_objects.length !== 0)
                array_last(m_diagram_objects).handle_cursor_move(cursor.as_read_only());
            
            snap_last_object_to_guidelines();
        });
        
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
            if (m_diagram_objects.length !== 0)
                array_last(m_diagram_objects).handle_cursor_move(cursor.as_read_only());
            snap_last_object_to_guidelines();
        });
    }
    
    m_bar_menu.push_entry("Edit", function() {
        for_each(m_diagram_objects, function(object) { 
            object.enable_editing();
        });
        console.log("edit");

        cursor.set_just_clicked_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            for_each(m_diagram_objects, function(object) {
                object.handle_cursor_click(cursor.as_read_only());
            });            
        });
        
        cursor.set_just_released_event(function() {
            // indentical to draw
            // so these are common to both draw and edit?
            snap_last_object_to_guidelines();
            delete_objects_too_small();
            
            for_each(m_diagram_objects, function(object) {
                object.handle_cursor_click(cursor.as_read_only());
            });
        });
        
        cursor.set_click_held_event(function() {}); // necessary, useful?
        
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
            
            for_each(m_diagram_objects, function(object) {
                object.handle_cursor_move(cursor.as_read_only());
            });
            snap_last_object_to_guidelines();
        });
    });
    
    m_bar_menu.push_entry("Draw", function() {
        for_each(m_diagram_objects, function(object) {
            object.disable_editing();
        });
        console.log("draw");
        change_to_draw_mode(m_cursor_ref);
    });
    
    var m_candidate_group = undefined;
    var m_groups = [];
    m_bar_menu.push_entry("Group", function() {
        var cursor = m_cursor_ref;
        m_candidate_group = [];
        cursor.reset_events();
        cursor.set_just_released_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            
            var objs = m_diagram_objects;
            m_diagram_objects = array_trim_first(objs, function(object) {
                if (!object.point_within(cursor.location(), 10)) return false;
                
                object.highlight();
                m_candidate_group.push(object);
                
                return true;
            });
        });
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
        });
    });
    
    m_bar_menu.push_entry("Ungroup", function() {
        var cursor = m_cursor_ref;
        
        // ass convuluted...
        if (m_candidate_group !== undefined) {
            for_each(m_candidate_group, function(item) {
                item.unhighlight();
            });
            m_diagram_objects.push(new Group(m_candidate_group));
            m_candidate_group = undefined;
        }
        
        cursor.reset_events();
        cursor.set_just_released_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            
            var ungrouped_items = [];
            var objs = m_diagram_objects;
            m_diagram_objects = array_trim_first(objs, function(object) {
                if (!object.point_within(cursor.location(), 10)) return false;
                var gv = object.explode();
                if (Array.isArray(gv)) {
                    for_each(gv, function(obj) {
                        ungrouped_items.push(obj);
                    });
                } else {
                    ungrouped_items.push(gv);
                }
                return true;
            });
            assert_no_empties(ungrouped_items);
            for_each(ungrouped_items, function(items) {
                m_diagram_objects.push(items);
            });
            assert_no_empties(m_diagram_objects);
        });

        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
        });
    });
    
    m_bar_menu.push_entry("Undo", function(){
        console.log("Undo!");
        // Remove the latest line added to m_lines
        m_last_undone_object = array_last(m_diagram_objects);
        m_diagram_objects.pop();
    });

    /*m_bar_menu.push_entry("Redo", function(){
        console.log("Redo");
        m_lines.push(last_undone_line);
        last_undone_line = new Line();
    });*/
    
    change_to_draw_mode();
    
    this.render_to = function(view) {
        // view is a draw context object
        view.fillStyle = "#000";
        if (m_cursor_box !== undefined) {
            view.fillRect(m_cursor_box.x    , m_cursor_box.y,
                          m_cursor_box.width, m_cursor_box.height);
        }
        function draw_each_of(array) {
            for_each(array, function(item) { item.draw(view); });
        }
        draw_each_of(m_diagram_objects);

        if (m_candidate_group !== undefined) {
            for_each(m_candidate_group, function(primitive) { primitive.draw(view); });
        }
        m_bar_menu.draw(view);
    }
}
