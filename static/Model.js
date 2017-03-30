"use strict";

(function(){
    // "concept checking"
    // must meet a "common interface"
    // concern: this interface is becoming too bulky?
    // primitives are handling their own events?!
    function find_missing_function(obj) {
        var required_functions = [
            "highlight", "unhighlight", 
            // geometry
            "point_within", "bounds",
            "explode", 
            "draw", 
            // events
            "handle_cursor_move", "handle_cursor_click",
            // edit mode specific
            "enable_editing", "disable_editing"];
        var rv = "";
        required_functions.forEach(function(str) {
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
    [new Line(), new Group([]), new Polygon, new Ellipse].forEach(function(obj) {
        var gv = find_missing_function(obj);
        if (gv !== "") {
            throw get_object_name(obj) + " does not have a required " + 
                  "function defined: \"" + gv + "\".";
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
        array.forEach(function(item) {
            if (item instanceof Line)
                return func(item);
        });
    }
    
    function assert_no_empties(array) {
        array.forEach(function(item) {
            if (item === undefined)
                throw "Array contains undefineds!";
        });
    }
    
    function cursor_box_size() { return { x: 10, y: 10 }; }
    
    function snap_last_object_to_guidelines() {
        if (m_diagram_objects.length === 0) return;
        m_guidelines.forEach(function(guideline) {
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
    
    function change_to_draw_mode(create_new_diagram_object) {
        cursor.set_just_clicked_event(function() {
            // do not create a primitive if the menu captures the cursor's 
            // input
            if (m_bar_menu.check_click(cursor.location()))
                return;
            if (m_diagram_objects.length > 0) {
                if (!array_last(m_diagram_objects).finished_creating())
                    return;
            }
            // we can now trade this for any primitive
            // Say an ellipse or polygon or Text
            m_diagram_objects.push(create_new_diagram_object());
            array_last(m_diagram_objects).handle_cursor_click(cursor.as_read_only());
        });
        
        cursor.set_just_released_event(function() {
            //delete_objects_too_small();
            snap_last_object_to_guidelines();
            if (m_diagram_objects.length !== 0)
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
    
    m_bar_menu.push_entry("Edit", function(entry) {
        m_diagram_objects.forEach(function(object) { 
            object.enable_editing();
        });
        entry.on_mode_exit = function () {
            m_diagram_objects.forEach(function(object) { 
                object.disable_editing();
            });
        };

        cursor.set_just_clicked_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            m_diagram_objects.forEach(function(object) {
                object.handle_cursor_click(cursor.as_read_only());
            });
        });
        
        cursor.set_just_released_event(function() {
            // indentical to draw
            // so these are common to both draw and edit?
            snap_last_object_to_guidelines();
            delete_objects_too_small();
            
            m_diagram_objects.forEach(function(object) {
                object.handle_cursor_click(cursor.as_read_only());
            });
        });
        
        cursor.set_click_held_event(function() {}); // necessary, useful?
        
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());
            
            m_diagram_objects.forEach(function(object) {
                object.handle_cursor_move(cursor.as_read_only());
            });
            snap_last_object_to_guidelines();
        });
    });
    
    m_bar_menu.push_entry("Draw", function() {
        change_to_draw_mode(function() { return new Line() });
    });
    m_bar_menu.set_last_added_entry_as_default();
    
    m_bar_menu.push_entry("Polygon", function() {
        change_to_draw_mode(function() { return new Polygon() });
    });
    
    var finish_grouping = function() {
        if (m_candidate_group === undefined) return;
        
        // candidate groups with one member -> is already a 'group'
        if (m_candidate_group.length === 1) {
            m_diagram_objects.push(m_candidate_group[0]);
            m_candidate_group = undefined;
            return;
        }
        
        // usual grouping behavior
        m_candidate_group.forEach(function(item) {
            item.unhighlight();
        });
        m_diagram_objects.push(new Group(m_candidate_group));
        m_candidate_group = undefined;
    }
    
    var m_candidate_group = undefined;
    var m_groups = [];
    m_bar_menu.push_entry("Group", function(entry) {
        var cursor = m_cursor_ref;
        m_candidate_group = [];
        cursor.reset_events();

        entry.on_mode_exit = function () {
            console.log('Left grouping mode.');
            m_candidate_group.forEach(function(object) {
                m_diagram_objects.push(object);
            });
            m_diagram_objects.forEach(function(object) {
                object.unhighlight();
            });
            m_candidate_group = undefined;
        }
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
    
    m_bar_menu.push_entry("Group Done", function() {
        var cursor = m_cursor_ref;
        
        finish_grouping();
        
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
                    gv.forEach(function(obj) {
                        ungrouped_items.push(obj);
                    });
                } else {
                    ungrouped_items.push(gv);
                }
                return true;
            });
            assert_no_empties(ungrouped_items);
            ungrouped_items.forEach(function(items) {
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

    m_bar_menu.push_entry("Save", function(){
        var id = 'main-canvas';
        var currentdate = new Date(); 
        var datetime = currentdate.getDate() + "-"
                + (currentdate.getMonth()+1)  + "-" 
                + currentdate.getFullYear() + "-"  
                + currentdate.getHours() + "-"  
                + currentdate.getMinutes() + "-" 
                + currentdate.getSeconds();
        var fileName = 'canvas_' + datetime.toString();

        var canvasElement = document.getElementById(id);

        var MIME_TYPE = "image/png";

        var imgURL = canvasElement.toDataURL(MIME_TYPE);

        var dlLink = document.createElement('a');
        dlLink.download = fileName;
        dlLink.href = imgURL;
        dlLink.dataset.downloadurl = [MIME_TYPE, dlLink.download, dlLink.href].join(':');

        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
    });

    /*m_bar_menu.push_entry("Redo", function(){
        console.log("Redo");
        m_lines.push(last_undone_line);
        last_undone_line = new Line();
    });*/
    
    this.render_to = function(view) {
        // view is a draw context object
        view.fillStyle = "#000";
        function draw_each_of(array) {
            array.forEach(function(item) { item.draw(view); });
        }
        draw_each_of(m_diagram_objects);
        if (m_candidate_group !== undefined) {
            draw_each_of(m_candidate_group);
        }
        m_bar_menu.draw(view);
        if (m_cursor_box !== undefined) {
            view.fillRect(m_cursor_box.x    , m_cursor_box.y,
                          m_cursor_box.width, m_cursor_box.height);
        }
    }
}
