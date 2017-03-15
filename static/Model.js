"use strict";

(function(){
    // "concept checking"
    // must meet a "common interface"
    function find_missing_function(obj) {
        var required_functions = [
            "show_control_points", "hide_control_points", "point_within",
            "explode", "draw", "bounds", "handle_cursor_click"];
        var rv = ""
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
            throw get_object_name(obj) + " does not have a required function defined: \"" + gv + "\".";
        }
    });
}());

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

    var m_lines = [];
    var last_undone_line = new Line();

    // weak references are not possible in JavaScript
    // I maybe stuck with type switching... (ew)
    // (perhaps in a new standard)
    var m_diagram_objects = [];
    
    var m_guidelines = [{ x: 1, y: 0 }, { x: 0, y: 1 }, Vector.norm({ x: 3, y: 1 }) ];
    
    var m_bar_menu = new BarMenu();
    
    var m_cursor_box = undefined;
    var self = this;
    
    function cursor_box_size() { return { x: 10, y: 10 }; }
    
    function snap_last_object_to_guidelines() {
        if (m_lines.length === 0) return;
        for_each(m_guidelines, function(guideline) {
             // line specific
            array_last(m_lines).snap_to_guideline(guideline, Math.PI/32);
        });
    }
    
    function delete_objects_too_small() {
        m_lines = array_trim(m_lines, function(line) {
            var bounds = line.bounds();
            return (bounds.width < 10.0 && bounds.height < 10.0);
        });
    }

    function load_XMB() {

        var pug = require('pug');

        // compile index.pug in /XMB/ 
        var fn = pug.compileFile('XMB/index.pug');

        // render the function
        var html = fn(locals);

        console.log(html);
    }
    
    function change_to_draw_mode() {
        cursor.set_just_clicked_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            
            m_lines.push(new Line());
            array_last(m_lines).set_at(cursor.location()); // line specific
        });
        
        cursor.set_just_released_event(function() {
            delete_objects_too_small();
            snap_last_object_to_guidelines();
        });
        
        cursor.set_click_held_event(function() {
            // this is a continuous 'event'
            // it is called on each time based update iff the cursor was 
            // pressed on this and the previous frame
            
            if (m_lines.length !== 0)
                array_last(m_lines).pull(cursor.location()); // line specific
            
            snap_last_object_to_guidelines();
        });
        
        cursor.set_location_change_event(function() {
            // identical to edit
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
            
            for_each(m_lines, function(line) {
                line.handle_cursor_move(cursor.location());
            });
            snap_last_object_to_guidelines();
        });
    }
    
    m_bar_menu.push_entry("Edit", function() {
        for_each(m_lines, function(line) {
            line.enable_editing();
        });
        console.log("edit");

        cursor.set_just_clicked_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            for_each(m_lines, function(line) {
                line.handle_cursor_click(cursor.location(), cursor.is_pressed());
            });
        });
        
        cursor.set_just_released_event(function() {
            // indentical to draw
            // so these are common to both draw and edit?
            snap_last_object_to_guidelines();
            delete_objects_too_small();
            
            for_each(m_lines, function(line) {
                line.handle_cursor_click(cursor.location(), cursor.is_pressed());
            });
        });
        
        cursor.set_click_held_event(function() {});
        
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
            
            for_each(m_lines, function(line) {
                line.handle_cursor_move(cursor.location());
            });
            snap_last_object_to_guidelines();
        });
    });
    
    m_bar_menu.push_entry("Draw", function() {
        for_each(m_lines, function(line) {
            line.disable_editing();
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
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
        });
    });
    
    m_bar_menu.push_entry("Ungroup", function() {
        var cursor = m_cursor_ref;
        
        // ass convuluted...
        if (m_candidate_group !== undefined) {
            for_each(m_candidate_group, function(item) {
                item.hide_control_points();
            });
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
                if ( (rv = group.point_within(cursor.location(), 10)) )
                    ungrouped_items = group.explode();
                return rv;
            });
            handle_ungrouped_items(ungrouped_items);
        });

        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
        });
    });
    
    m_bar_menu.push_entry("Undo", function(){
        console.log("Undo!");
        // Remove the latest line added to m_lines
        last_undone_line = m_lines[m_lines.length-1];
        m_lines.pop();
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
        for_each(m_lines, function(line) { line.draw(view); });
        for_each(m_groups, function(group) { group.draw(view); });
        if (m_candidate_group !== undefined) {
            for_each(m_candidate_group, function(primitive) { primitive.draw(view); });
        }
        m_bar_menu.draw(view);
    }
}
