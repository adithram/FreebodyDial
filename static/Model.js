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
    [new Line(), new Group([])].forEach(function(obj) {
        var gv = find_missing_function(obj);
        if (gv !== "") {
            throw get_object_name(obj) + " does not have a required " + 
                  "function defined: \"" + gv + "\".";
        }
    });
}());

function Ellipse() {
    assert_new.check(this);
    var m_radii = zero_vect();
    // location means origin
    var m_location = zero_vect();
    
    var m_first_point = undefined;
    var m_finished_creating = false;
    var self = this;
    this.set_location = function(x_, y_) { m_location = { x: x_, y: y_ }; }
    this.set_radii = function(x_, y_) { m_radii = { x: x_, y: y_ }; }
    this.finished_creating = function() { return m_finished_creating; }
    this.highlight = function() {}
    this.unhighlight = function() {}
    this.enable_editing  = function() {}
    this.disable_editing = function() {}
        
    this.point_within = undefined;
    this.explode = function() { return this; } 
    this.bounds = function() {
        return { x : m_location.x - m_radii.x, 
                 y : m_location.y - m_radii.y, 
                 width : m_radii.x*2.0, 
                 height: m_radii.y*2.0 }
    }
    
    var creation_second_handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) return; // release event only
        // initial function
        console.log('moving to final step...')
        m_first_point = cursor_obj.location();
        self.handle_cursor_move = function(cursor_obj) {
            var cur_loc = cursor_obj.location();
            // x1 = x0 + a * cos(t) -> (x1 - x0)/cos(t) = a 
            // y1 = y0 + b * sin(t) -> (y1 - y0)/sin(t) = b
            // x2 = x0 + a * cos(u)
            // y2 = y0 + b * sin(u)
            // x1 - x2 = a * cos(t) - a * cos(u)
            // x1 - x2 = a * ( cos(t) - cos(u) )
            // y1 - y2 = b * ( sin(t) - sin(u) )
            //var u = Vector.angle_between({ x: 1, y: 0 }, m_first_point);
            //var t = Vector.angle_between({ x: 1, y: 0 }, cur_loc      );
            var num = cur_loc.x**2*m_first_point.y**2 - cur_loc.y**2*m_first_point.x**2;
            m_radii.x = Math.sqrt(Math.abs(num / (cur_loc.x**2 - m_first_point.x**2)));
            m_radii.y = Math.sqrt(Math.abs(num / (cur_loc.y**2 - m_first_point.y**2)));
            //m_radii.y = (cur_loc.x - m_first_point.x) / (Math.cos(t) - Math.cos(u));
            //m_radii.x = (cur_loc.y - m_first_point.y) / (Math.sin(t) - Math.sin(u));
            if (Math.random() > 0.95) {
                //console.log("angle values fp: "+u+" cur_pos: "+t);
                console.log("radii values : (x: "+m_radii.x+", y: "+m_radii.y+")");
            }
        }
        self.handle_cursor_click = function(cursor_obj) {
            if (!cursor_obj.is_pressed()) {
                m_finished_creating = true;
                self.handle_cursor_click = self.handle_cursor_move = function(_) {}
            }
        }
    }
    
    this.handle_cursor_click = function(cursor_obj) {
        if (cursor_obj.is_pressed()) {
            m_location = cursor_obj.location();
            console.log("ellipse location set");
            return;
        }
        console.log("cursor move event function changed");
        self.handle_cursor_move = function(cursor_obj) {
            m_radii.x = m_radii.y = Vector.distance(cursor_obj.location(), m_location);
        }
        
        self.handle_cursor_click = creation_second_handle_cursor_click;
    }
    
    this.handle_cursor_move = function(_) {} 
    
    this.draw = function(context) {
        // save state
        context.save();

        // scale context horizontally
        context.translate(m_location.x, m_location.y);
        context.scale    (m_radii.x   , m_radii.y   );
        
        // draw circle which will be stretched into an oval
        context.beginPath();
        context.arc(0, 0, 1, 0, 2*Math.PI, false);
        
        // restore to original state
        context.restore();

        // apply styling
        context.fillStyle = 'black';
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = 'black';
        context.stroke();
        if (m_first_point !== undefined) {
            var fp_bounds = Vector.bounds_around(m_first_point, { x: 10, y: 10 });
            draw_bounds_as_black_outlined_box(context, fp_bounds, 'black');
        }
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
        array.forEach(function(item) {
            if (item instanceof Line)
                return func(item);
        });
    }
    
    function assert_no_empties(array) {
        array.forEach(function(item) {
            if (item === undefined)
                throw "Array contains empties!";
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
    
    function change_to_draw_mode() {
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
            m_diagram_objects.push(new Polygon());
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
    
    m_bar_menu.push_entry("Edit", function() {
        m_diagram_objects.forEach(function(object) { 
            object.enable_editing();
        });
        console.log("edit");

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
        m_diagram_objects.forEach(function(object) {
            object.disable_editing();
        });
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

    m_bar_menu.push_entry("Polygon", function(){
        console.log("Undo!");
        // Remove the latest line added to m_lines
        m_last_undone_object = array_last(m_diagram_objects);
        m_diagram_objects.pop();
    });
    
    m_bar_menu.push_entry("Undo", function(){
        console.log("Undo!");
        // Remove the latest line added to m_lines
        m_last_undone_object = array_last(m_diagram_objects);
        m_diagram_objects.pop();
    });

    m_bar_menu.push_entry("Save", function(){
        var currentdate = new Date(); 
        var datetime = currentdate.getDate() + "-"
                + (currentdate.getMonth()+1)  + "-" 
                + currentdate.getFullYear() + "-"  
                + currentdate.getHours() + "-"  
                + currentdate.getMinutes() + "-" 
                + currentdate.getSeconds();
        var fileName = 'canvas_' + datetime.toString();

        var canvasElement = document.getElementById('main-canvas');

        var window_width = canvasElement.width;
        var window_height = canvasElement.height;


        var tempCanvas = document.createElement("canvas"),
        tCtx = tempCanvas.getContext("2d");
       
        tCtx.canvas.width = window_width;
        tCtx.canvas.height = window_height - window_height/7;


        var x_start = 0;
        var y_start_org = window_height/7;
        var y_start_copy = 0;
        var width = window_width ;
        var height = window_height - window_height/7;
      
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
            array.forEach(function(item) { item.draw(view); });
        }
        draw_each_of(m_diagram_objects);

        if (m_candidate_group !== undefined) {
            for_each(m_candidate_group, function(primitive) { primitive.draw(view); });
        }
        m_bar_menu.draw(view);
    }
}
