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

function assert_not_nan(f) {
    if (f != f)
        throw "Nan!";
}

function array_last(arr) { return arr[arr.length - 1]; }

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
    }
}

Object.freeze(Vector);

var g_this = this;

function zero_vect() { return { x: 0, y: 0 }; }

function deepcopy(obj) { return $.extend(true, {}, obj); }

function for_each(array, callback) {
    for (var i = 0; i < array.length; ++i) {
        var wants_break = callback(array[i]);
        if (wants_break !== undefined) {
            if (wants_break === true)
                return;
        }
    }
}

function LineControlPoints(point_a, point_b) {
    assert_new.check(this);
    
    var m_point_size = 10;
    
    var m_move_point_a = bounds_around(point_a);
    var m_move_point_b = bounds_around(point_b);
    var m_move_whole_line = bounds_around(avg_vect(point_a, point_b));
    var m_update_control_point_func = undefined;
    
    function bounds_around(point) {
        return { x: point.x - m_point_size/2, y: point.y - m_point_size/2,
                 width: m_point_size, height: m_point_size };
    }
    
    function avg_vect(u, v) {
        return { x: (u.x + v.x)/2, y: (u.y + v.y)/2 };
    }
    
    function draw_point_bounds(context, cp_bounds, fill_color) {
        context.beginPath();
        context.rect(cp_bounds.x, cp_bounds.y, cp_bounds.width, cp_bounds.height);
        context.fillStyle = fill_color;
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = 'black';
        context.stroke();
    }
    
    var update_point_a = function(cursor_pos, parent) {
        parent.set_at(cursor_pos);
        m_move_point_a = bounds_around(cursor_pos);
        m_move_whole_line = bounds_around(avg_vect(cursor_pos, m_move_point_b));
    };
    
    var update_point_b = function(cursor_pos, parent) {
        parent.pull(cursor_pos);
        m_move_point_b = bounds_around(cursor_pos);
        m_move_whole_line = bounds_around(avg_vect(m_move_point_a, cursor_pos));
    };
    
    var update_both_points = function(cursor_pos, parent) {
        var center_of = function(bounds) {
            return { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height/2 };
        };
        var cent = center_of(m_move_whole_line);
        var to_a = Vector.sub(center_of(m_move_point_a, cent));
        var to_b = Vector.sub(center_of(m_move_point_b, cent));
        m_move_whole_line = bounds_around(cent);
        m_move_point_a = bounds_around(Vector.add(cent, to_a));
        m_move_point_b = bounds_around(Vector.add(cent, to_b));
    };
    
    this.draw = function(context) {
        draw_point_bounds(context, m_move_point_a   , 'yellow');
        draw_point_bounds(context, m_move_point_b   , 'yellow');
        draw_point_bounds(context, m_move_whole_line, 'blue'  );
    }
    
    this.update_control_point = function(cursor_pos, parent) {
        if (m_update_control_point_func === undefined) return;
        m_update_control_point_func(cursor_pos, parent);
    }
    
    this.handle_control_point_click = function(cursor_pos, parent) {
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
            return 'b';
        }
    }
}

// proposal: adding clickable 'widgets' on these diagram primatives
// allowing for movement, rotation grouping(?) and anything else we need
// though there is risk of crowding the interface
function Line() {
    assert_new.check(this);

    var m_point_a = zero_vect();
    var m_point_b = zero_vect();
    var m_control_points = undefined;
    
    /**************************************************************************
                                  Line Creation
    **************************************************************************/

    this.set_at = function(v) { m_point_a = v; }

    this.pull = function(v) { m_point_b = v; }
    
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
        var v = { x: guide_line.x, y: guide_line.y };
        m_point_b = { x: -saved_mag*scalar*(v.x) + m_point_a.x,
                      y: -saved_mag*scalar*(v.y) + m_point_a.y };
        $("#debug-message-1").text("snapped: " + 
            Vector.to_string(diff) + " " + Vector.to_string(m_point_a) + " " +
            saved_mag + " " + scalar + " " +
            Vector.to_string(m_point_b)
        );
        
        return true;
    }
        
    /**************************************************************************
                                  Line Editing
    **************************************************************************/

    this.enable_editing = function()
        { m_control_points = new LineControlPoints(m_point_a, m_point_b); }

    this.update_editing = function(cursor_pos) {
        if (m_control_points === undefined) return;
        //var gv = m_control_points.up
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
}

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
        if (m_entries.length === 0) return;
        if (m_entries[0].bounds === undefined) return;
        for_each(m_entries, function(entry) {
            // ... reinventing the wheel?
            if (Vector.in_bounds(cursor, entry.bounds)) {
                entry.callback();
                return true;
            }
        });
    }
    
    // I wish I could do this with regular HTML elements, it would be soooo
    // much easier and allow fancier graphics
    // this function DOES modify the state of the object
    this.draw = function(context) {
        var draw_position = deepcopy(m_location);
        var debug_string = "";
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
            
            debug_string += "Where: " + Vector.to_string(draw_position) +
                            " how big: " + Vector.to_string(entry_size) + "<br />";
            // draw box around entry
            context.beginPath();
            context.rect(draw_position.x, draw_position.y, entry_size.x, entry_size.y);
            context.stroke();
            
            // entry text
            context.fillText(entry.text, draw_position.x, draw_position.y + entry_size.y)
            
            m_size.x += entry_size.x;
            draw_position.x += entry_size.x;
        });
        $("#debug-message-2").text(debug_string);
    }
}

function Model() {
    assert_new.check(this);

    // We could in the future use state machine to seperate different modes for
    // this front end

    // cursor state
    var m_cursor_location  = zero_vect();
    var m_cursor_direction = zero_vect();
    var m_cursor_velocity  = zero_vect();
    var m_min_speed        = 200;

    var m_time_since_previous_click = 0;
    var m_click_was_held = false; // history
    var m_click_held = false;

    var m_lines = [new Line()];
    var m_guidelines = [{ x: 1, y: 0 }, { x: 0, y: 1 }, Vector.norm({ x: 3, y: 1 }) ];
    
    var m_bar_menu = new BarMenu();
    
    m_bar_menu.push_entry("Enter Edit Mode", function(){});
    m_bar_menu.push_entry("Enter Draw Mode", function(){});

    this.set_location = function(loc) {
        assert_not_nan(loc.x); assert_not_nan(loc.y);
        m_cursor_location = loc;
        // primative creation
        if (m_click_held && m_click_was_held) {
            array_last(m_lines).pull(m_cursor_location);
        } else if (m_click_held && !m_click_was_held) {
            array_last(m_lines).set_at(m_cursor_location);
            array_last(m_lines).pull  (m_cursor_location);
        } else if (!m_click_held && m_click_was_held) {
            array_last(m_lines).enable_editing();
            m_lines.push(new Line());
        }
    }

    this.move = function(dir) {
        if (dir.x === 0 && dir.y === 0) {
            // STOP the cursor
            m_cursor_velocity = zero_vect();
        }
        m_cursor_direction = dir;
        //$("#debug-message").text("x: " + dir.x + " y: " + dir.y);
    }

    this.button = function(pressed) {
        // double click thershold
        // I have an idea how we can use this n.~
        if (!pressed && m_time_since_previous_click < 0.2) {
        }
        if (pressed) {
            m_bar_menu.check_click(m_cursor_location);
        }

        m_time_since_previous_click = 0;
        m_click_was_held = m_click_held;
        m_click_held     = pressed;
    }

    this.update = function(et) {
        // primative creation
        for (var i = 0; i < m_guidelines.length; ++i) {
            array_last(m_lines).snap_to_guideline(m_guidelines[i], Math.PI/32);
        }
        
        // for move controls
        var mul   = function(s ,  v) { return { x:s*v.x    , y:s*v.y     }; };
        var add   = function(v1, v2) { return { x:v1.x+v2.x, y:v1.y+v2.y }; };
        var addeq = function(v ,  u) { v.x += u.x; v.y += u.y; };
        var mag   = Vector.mag; //function(v)      { return Math.sqrt(v.x*v.x + v.y*v.y); }
        var norm  = function(v) {
            var mag_ = mag(v);
            return { x: v.x/mag_, y: v.y/mag_ };
        };

        if (mag(m_cursor_direction) !== 0) {
            //var acceleration = mul(500, m_cursor_direction);
            //addeq(m_cursor_velocity, mul(et, acceleration));
            //if (mag(m_cursor_velocity) < m_min_speed) {
            //    m_cursor_velocity = mul(m_min_speed, norm(m_cursor_velocity));
            //}
            addeq(m_cursor_location, mul(m_min_speed*et, m_cursor_direction));
            m_cursor_direction = zero_vect();
        }
        m_time_since_previous_click += et;
    }
    this.render_to = function(view) {
        // view is a draw context object
        view.fillStyle = "#000";
        var size = 10;
        var loc = m_cursor_location;
        view.fillRect(loc.x - size/2, loc.y - size/2, size, size);

        for (var i = 0; i != m_lines.length; ++i) {
            m_lines[i].draw(view);
        }
        m_bar_menu.draw(view);
    }
}

function KeyboardController() {
    assert_new.check(this);
    var m_keys_down = {};
    this.update_model = function(model, et) {
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
        model.move({ x : x_dir, y : y_dir });
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
    this.update_model = function(model, et) {
        model.button      (m_mouse_pressed );
        model.set_location(m_mouse_location);
    }
    this.mouse_click = function(pressed) {
        m_mouse_pressed = pressed;
    }
}

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
    this.update_model = function(model, et) {
        model.button(m_click    );
        model.move  (m_direction);
    }
}

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
    var m_model = new Model();
    var m_active_controller;
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
        //m_active_controller.update_model(m_model, et);
        for (var i = 0; i < m_controllers.length; ++i) {
            m_controllers[i].update_model(m_model, et);
        }
        m_model.update(et);
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
        // ...
        m_active_controller = m_json_controller;//m_mouse_controller;//m_keyboard_controller;
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
