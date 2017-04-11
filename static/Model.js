/*******************************************************************************
 *
 *  Copyright 2017
 *  Authors: Andrew Janke, Dennis Chang, Lious Boehm, Adithya Ramanathan
 *  Released under the GPLv3
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 ******************************************************************************/

"use strict";

// Less behavioral and more assertation. 
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
            // events -> for editing
            "handle_cursor_move", "handle_cursor_click",
            // edit mode specific
            "enable_editing", "disable_editing",
            // momento save/restore
            "expose"];
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
    [new Line(), new Group([]), new Polygon(), new Ellipse()].forEach(function(obj) {
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
    // Diagram objects themselves are the various drawn items on the canvas. 
    var m_diagram_objects = [];
    var m_last_undone_object = undefined;

    // :WARNING: I AM going to change how this works!
    var m_guidelines = [{ x: 1, y: 0 }, { x: 0, y: 1 }, Vector.norm({ x: 3, y: 1 }) ];

    // Creates the bar menu. 
    var m_bar_menu = new BarMenu();

    var m_cursor_box = undefined;
    var self = this; // some closures can't get to 'this', self is a fix for 'this'
    
    // Perform action on each line based on user button/navbar selection. 
    function for_each_line_in(array, func) {
        array.forEach(function(item) {
            if (item instanceof Line)
                return func(item);
        });
    }
    
    // Ensure that the array does not contain any undefined values - this should not occur in theory. 
    function assert_no_empties(array) {
        array.forEach(function(item) {
            if (item === undefined)
                throw "Array contains undefineds!";
        });
    }
    
    // Default cursor box size. Seen when editing. 
    function cursor_box_size() { return { x: 10, y: 10 }; }
    
    // snapping function - so that Brad does not have to deal with "squiggly" lines
    function snap_last_object_to_guidelines() {
        if (m_diagram_objects.length === 0) return;
        m_guidelines.forEach(function(guideline) {
            // line specific
            var last = array_last(m_diagram_objects);
            if (last instanceof Line)
                last.snap_to_guideline(guideline, Math.PI/32);
        });
    }
    
    // Declare a minimum size requirement so that certain accidental creations aren't saved or used.
    function delete_objects_too_small() {
        m_diagram_objects = array_trim(m_diagram_objects, function(object) {
            var bounds = object.bounds();
            return (bounds.width < 10.0 && bounds.height < 10.0);
        });
    }

    function handle_cursor_move_on_last_if_exists(cursor) {
        if (m_diagram_objects.length !== 0)
            array_last(m_diagram_objects).handle_cursor_move(cursor.as_read_only());
    }
    
    // Changes to draw mode.
    function change_to_draw_mode(create_new_diagram_object) {
        /** In any function that changes the mode of the "model", events are
         *  assigned to the cursor object, which is an abstraction of the users
         *  peripherals, be it mouse and keyboard or the dial.
         */
        cursor.set_just_clicked_event(function() {
            // do not create a primitive if the menu captures the cursor's  
            // input
            if (m_bar_menu.check_click(cursor.location()))
                return;
            if (m_diagram_objects.length > 0) {
                // detect if the object has finished its creation
                // do not assume "it will tell us", but if it doesn't we will
                // assume it has finished
                var last_obj = array_last(m_diagram_objects);
                if (last_obj.finished_creating !== undefined) {
                    if (!last_obj.finished_creating())
                        return;
                }
            }
            // we can now trade this for any primitive
            // Say an ellipse or polygon or Text
            m_diagram_objects.push(create_new_diagram_object());
            array_last(m_diagram_objects).handle_cursor_click(cursor.as_read_only());
        });

        cursor.set_just_released_event(function() {
            //delete_objects_too_small();
            snap_last_object_to_guidelines();
            handle_cursor_move_on_last_if_exists(cursor);
            if (m_diagram_objects.length !== 0)
                array_last(m_diagram_objects).handle_cursor_click(cursor.as_read_only());
            delete_objects_too_small();
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

    /***************************************************************************
     *  Add Bar Menu Events; each entry contains code that will run when the
     *  user presses the cursor inside that entry
     **************************************************************************/
    
    // // Bar menu event for Instructions
    m_bar_menu.push_entry("How to...", function(entry) {
        //Instructions on what the user should do.
        var draw_instructions = "Instructions to Draw: \n1) Select the shape you want (line or polygon) from the menu.\n";
        draw_instructions = draw_instructions +  "2) To draw a line, click and then drag the cursor until desired length is achieved.\n";
        draw_instructions = draw_instructions + "3) To draw a polygon, click and drag line. When new corner desired click again. Return to start point to close.\n";

        var edit_instructions = "\nInstructions to Edit:\n1) Select edit mode from the menu.\n";
        edit_instructions = edit_instructions + "2) To resize, select a yellow corner control point and drag.\n";
        edit_instructions = edit_instructions + "3) To translate, select the blue square and drag and click accordingly to desired location.\n";

        var group_instructions = "\nInstructions to Group:\n1) Select group mode from the menu\n";
        group_instructions = group_instructions + "2) Select the objects you desire to group with your cursor.\n";
        group_instructions = group_instructions + "3) Select 'Group Done' when you are done selecting the desired objects\n";

        var save_instructions = "\nInstruction to Save:\n1) Select save from the menu\n2) Select location and rename if desired in popup window\n";

        var undo_instructions = "\nInstructions to Undo:\n1) Select edit from the menu to undo drawing the last object created\n"

        var all_instructions = draw_instructions + edit_instructions + group_instructions + undo_instructions + save_instructions;

        alert(all_instructions);

    });



    // Bar menu event for Edit. 
    m_bar_menu.push_entry("Edit", function(entry) {
        // Enable editing for each object on the canvas. 
        m_diagram_objects.forEach(function(object) { 
            object.enable_editing();
        });

        /** This is called by the menu whenever the user leaves the current
         *  mode.
         */
         // Disables editing - removes control points. 
        entry.on_mode_exit = function () {
            m_diagram_objects.forEach(function(object) {
                object.disable_editing();
            });
        };

        // Handles clicking for the variety of objects persistent on the canvas. 
        cursor.set_just_clicked_event(function() {
            if (m_bar_menu.check_click(cursor.location()))
                return;
            m_diagram_objects.forEach(function(object) {
                object.handle_cursor_click(cursor.as_read_only());
            });
        });
        
        // Handles releasing for the variety of objects persistent on the vanvas. 
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
        
        // Location of object has saed. 
        cursor.set_location_change_event(function() {
            m_cursor_box = Vector.bounds_around(cursor.location(), cursor_box_size());

            m_diagram_objects.forEach(function(object) {
                object.handle_cursor_move(cursor.as_read_only());
            });
            snap_last_object_to_guidelines();
        });
    });

    
    // Triggers a line drawing mode. 
    m_bar_menu.push_entry("Line", function() {
        change_to_draw_mode(function() { return new Line() });
    });
    m_bar_menu.set_last_added_entry_as_default();
    
    // triggers polygon drawing mode. 
    m_bar_menu.push_entry("Polygon", function() {
        change_to_draw_mode(function() { return new Polygon() });
    });

    
    m_bar_menu.push_entry("Ellipse", function () {
        change_to_draw_mode(function() { return new Ellipse() });
    });
    
    // Grouping behavior. 
    var finish_grouping = function() {
        if (m_candidate_group === undefined) return;
        if (m_candidate_group.length === 0) {
            m_candidate_group = undefined;
            return;
        }
        // candidate groups with one member -> is already a 'group'
        else if (m_candidate_group.length === 1) {
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
    var k = { GROUP_DONE_TEXT : "Group Done" };
    Object.freeze(k);
    // Function for selecting objects to be grouped. 
    m_bar_menu.push_entry("Group", function(entry) {
        var cursor = m_cursor_ref;
        // Candidate group is the various objects to be grouped. 
        m_candidate_group = [];
        cursor.reset_events();

        entry.on_mode_exit = function (entry) {
            console.log('Left grouping mode.');

            if (entry.text === k.GROUP_DONE_TEXT) {
                finish_grouping();
                return;
            }

            if (m_candidate_group === undefined)
                return;
            
            // Copies objects from diagram objects to candidate group
            m_candidate_group.forEach(function(object) {
                m_diagram_objects.push(object);
            });
            // Handles highlighting selected objects. 
            m_diagram_objects.forEach(function(object) {
                object.unhighlight();
            });
            // Clears out candidate group once done. 
            m_candidate_group = undefined;
        }
        
        // Releases
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
    
    // Function that handles ending group mode. Groups the selected items. 
    m_bar_menu.push_entry(k.GROUP_DONE_TEXT, function() {
        var cursor = m_cursor_ref;

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
    
    // Function that handles undoing the last object creation.
    // Needs to be expanded to handle undoing all actions, not just drawing related ones. 
    m_bar_menu.push_entry("Undo", function(){
        console.log("Undo!");
        // Remove the latest line added to m_lines
        m_last_undone_object = array_last(m_diagram_objects);
        m_diagram_objects.pop();
    });

    // Saves object as png. 
    m_bar_menu.push_entry("Save", function(){
        var currentdate = new Date(); 

        // Deals with naming convention. 
        var datetime = currentdate.getDate() + "-"
                + (currentdate.getMonth()+1)  + "-"
                + currentdate.getFullYear() + "-"
                + currentdate.getHours() + "-"
                + currentdate.getMinutes() + "-"
                + currentdate.getSeconds();
        var fileName = 'canvas_' + datetime.toString();
        var canvasElement = document.getElementById('main-canvas');

        // Used to crop out menu bar. 
        var window_width = canvasElement.width;
        var window_height = canvasElement.height;
        // Create temporary canvas with elements but without menu bar. 
        var tempCanvas = document.createElement("canvas"),
        tCtx = tempCanvas.getContext("2d");

        tCtx.canvas.width = window_width;
        tCtx.canvas.height = window_height - window_height/7;
        var x_start = 0;
        var y_start_org = window_height/7;
        var y_start_copy = 0;
        var width = window_width ;
        var height = window_height - window_height/7;
      
        // Create and download image. 
        tCtx.drawImage(canvasElement, 
            x_start, 
            y_start_org, 
            width,  
            height, 
            x_start, 
            y_start_copy, 
            width, 
            height);
        var MIME_TYPE = "image/png";
        var imgURL = tempCanvas.toDataURL(MIME_TYPE);
        var dlLink = document.createElement('a');
        dlLink.download = fileName;
        dlLink.href = imgURL;
        dlLink.dataset.downloadurl = [MIME_TYPE, dlLink.download, dlLink.href].join(':');
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
    });

m_bar_menu.push_entry("Print", function(){

        var canvasElement = document.getElementById('main-canvas');

        // Used to crop out menu bar. 
        var window_width = canvasElement.width;
        var window_height = canvasElement.height;
        // Create temporary canvas with elements but without menu bar. 
        var tempCanvas = document.createElement("canvas"),
        tCtx = tempCanvas.getContext("2d");
       
        tCtx.canvas.width = window_width;
        tCtx.canvas.height = window_height - window_height/7;
        var x_start = 0;
        var y_start_org = window_height/7;
        var y_start_copy = 0;
        var width = window_width ;
        var height = window_height - window_height/7;
      
        // Create and download image. 
        tCtx.drawImage(canvasElement, 
            x_start, 
            y_start_org, 
            width,  
            height, 
            x_start, 
            y_start_copy, 
            width, 
            height);
        var MIME_TYPE = "image/png";

            canvasElement.style.display = 'none';
            //document.body.removeChild(canvasElement);

            document.body.appendChild(tempCanvas); // adds the canvas to the body element
            window.print()
            document.body.removeChild(tempCanvas);

            canvasElement.style.display = 'block';
            // document.body.appendChild(canvasElement); // adds the canvas to the body element

         // window.open(tempCanvas.toDataURL(MIME_TYPE), '_blank')

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