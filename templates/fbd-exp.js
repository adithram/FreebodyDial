"use strict";

var assert_new = {
    global_this : this,
    check : function(this_) {
        if (this_ === this.global_this)
            throw "You must use \"new\" to create new objects.";
    }
};

Object.freeze(assert_new);

var g_this = this;

function Model() {
    assert_new.check(this);

    // cursor state
    var m_cursor_location  = { x: 0, y: 0 };
    var m_cursor_direction = { x: 0, y: 0 };
    var m_cursor_velocity  = { x: 0, y: 0 };
    var m_min_speed        = 200;
    
    var m_time_since_previous_click = 0;

    this.set_location = function(loc) {
        m_cursor_location = loc;
    }

    this.move = function(dir) {
        if (dir.x === 0 && dir.y === 0) {
            // STOP the cursor
            m_cursor_velocity = { x: 0, y: 0 };
        }
        m_cursor_direction = dir;
        //$("#debug-message").text("x: " + dir.x + " y: " + dir.y);
    }

    this.click_button = function() {
        // double click thershold
        if (m_time_since_previous_click < 0.2) {
        }
        m_time_since_previous_click = 0;
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
        model.update(et);
    }
    this.update_key_press = function(keycode)
        { m_keys_down[keycode] = true; }
    this.update_key_release = function(keycode)
        { delete m_keys_down[keycode]; }
}

function MouseController() {
    assert_new.check(this);
    var m_mouse_location = { x: 0, y: 0 };
    this.update_location = function(loc) { m_mouse_location = loc; }
    this.update_model = function(model, et) {
        model.set_location(m_mouse_location);
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
    var m_model = new Model();
    var m_active_controller;

    /**************************************************************************
                                  Private Methods
    **************************************************************************/
    function run() {
        var now   = Date.now();
        var delta = now - m_time_then;
        update(delta / 1000);
        render();
        m_time_then = now;
        setTimeout(requestAnimationFrame(run), 50);
    }

    /** Update routine, this is called once per frame.
     *  @param {Number} et Elapsed time in seconds.
     */
    function update(et) {
        m_active_controller.update_model(m_model, et);
    }

    function render() {
        // clear screen
        m_context.fillStyle = "#FFF";
        m_context.fillRect(0, 0, m_canvas.width, m_canvas.height);
        // context and canvas used here
        m_model.render_to(m_context);
    }

    this.set_canvas_and_run = function(html_id_str) {
        m_canvas  = document.getElementById(html_id_str);
        m_context = m_canvas.getContext("2d", { alpha: false, depth: false});
        // anything else to start up
        // ...
        m_active_controller = m_mouse_controller;//m_keyboard_controller;
        // starts the app
        run();
    };

    this.key_press = function(code)
        { m_keyboard_controller.update_key_press(code); };

    this.key_release = function(code)
        { m_keyboard_controller.update_key_release(code); };
        
    this.mouse_move = function(loc) {
        $("#debug-message").text(m_mouse_controller);
        loc.x -= 10;
        loc.y -= 10;
        m_mouse_controller.update_location(loc);
    }
}

var g_app;

// intending to modify global this
this.start_app = function() {
    g_app = new App();
    g_app.set_canvas_and_run("main-canvas");
}
