"use strict";

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

var g_this = this;

function zero_vect() { return { x: 0, y: 0 }; }

// proposal: adding clickable 'widgets' on these diagram primatives
// allowing for movement, rotation grouping(?) and anything else we need
// though there is risk of crowding the interface
function Line() {
    assert_new.check(this);
    
    var m_point_a = zero_vect();
    var m_point_b = zero_vect();
    
    this.set_at = function(v) {
        m_point_a = v;
    }
    
    this.pull = function(v) {
        m_point_b = v;
    }
    
    this.draw = function(context) {
        context.beginPath();
        context.moveTo(m_point_a.x, m_point_a.y);
        context.lineTo(m_point_b.x, m_point_b.y);
        context.lineWidth = 5;
        // context.strokeStyle = '#ff0000';
        // context.lineCap
        context.stroke();
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

    var m_previous_lines = [];
    var m_sample_line = new Line();

    this.set_location = function(loc) {
        assert_not_nan(loc.x); assert_not_nan(loc.y);
        m_cursor_location = loc;
        if (m_click_held && m_click_was_held) {
            m_sample_line.pull(m_cursor_location);
        } else if (m_click_held && !m_click_was_held) {
            m_sample_line.set_at(m_cursor_location);
        } else if (!m_click_held && m_click_was_held) {
            m_previous_lines.push(m_sample_line);
            m_sample_line = new Line();
        }
    }

    this.move = function(dir) {
        if (dir.x === 0 && dir.y === 0) {
            // STOP the cursor
            m_cursor_velocity = { x: 0, y: 0 };
        }
        m_cursor_direction = dir;
        //$("#debug-message").text("x: " + dir.x + " y: " + dir.y);
        $('#debug-message-1').html(' x: ' + m_cursor_location.x + ' y: ' + m_cursor_location.y);
    }

    this.button = function(pressed) {
        // double click thershold
        if (!pressed && m_time_since_previous_click < 0.2) {
        }
        
        m_time_since_previous_click = 0;
        m_click_was_held = m_click_held;
        m_click_held     = pressed;
    }

    this.update = function(et) {
        var mul   = function(s ,  v) { return { x:s*v.x    , y:s*v.y     }; };
        var add   = function(v1, v2) { return { x:v1.x+v2.x, y:v1.y+v2.y }; };
        var addeq = function(v ,  u) { v.x += u.x; v.y += u.y; };
        var mag   = function(v)      { return Math.sqrt(v.x*v.x + v.y*v.y); }
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
        }
        m_time_since_previous_click += et;
    }
    this.render_to = function(view) {
        // view is a draw context object
        view.fillStyle = "#000";
        var size = 10;
        var loc = m_cursor_location;
        view.fillRect(loc.x - size/2, loc.y - size/2, size, size);
        
        for (var i = 0; i != m_previous_lines.length; ++i) {
            m_previous_lines[i].draw(view);
        }
        
        m_sample_line.draw(view);
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
    var m_json_controller = new JsonController();
    var m_controllers = [m_keyboard_controller, m_mouse_controller, m_json_controller];
    var m_model = new Model();
    var m_active_controller;
    var m_json_target;

    /**************************************************************************
                                  Private Methods
    **************************************************************************/
    function run() {
        var now   = Date.now();
        var delta = now - m_time_then;
        update(delta / 1000);
        render();
        // there maybe latency and network problems (spamming the network with
        // packet); perhaps 60 packets/s isn't much?
        //
        // on local machines, latency is unnoticable
        // the same for the most part on local network
        // I have noticed there are times where the script will wait for long
        // periods of time (1/10th of a second or so) for a response from the
        // server, producing jumpy like behavior on the page
        listen();
        m_time_then = now;
        setTimeout(requestAnimationFrame(run), 50);
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
        
    this.set_listen_target = function(target_address) 
        { m_json_target = target_address; }
}

var g_app;

// intending to modify global this
this.start_app = function() {
    g_app = new App();
    g_app.set_canvas_and_run("main-canvas");
}
