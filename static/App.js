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

function KeyboardAdapter() {
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

function MouseAdapter() {
    assert_new.check(this);
    var m_mouse_location = zero_vect();
    var m_mouse_pressed = false;
    this.update_location = function(loc) {
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
function JsonAdapter() {
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
    var m_keyboard_controller = new KeyboardAdapter();
    var m_mouse_controller = new MouseAdapter();
    var m_json_controller = undefined;
    var m_controllers = [m_keyboard_controller, m_mouse_controller];
    
    
    // "Backend" controller
    var m_cursor = new Controller();
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
        
        m_time_then = now;
    }

    /** Update routine, this is called once per frame.
     *  @param {Number} et Elapsed time in seconds.
     */
    function update(et) {
        m_controllers.forEach(function(controller) {
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
            type    : "GET",
            url     : m_json_target,
            success : function(data) { 
                m_json_controller.read_json(data); 
                run();
            },
            error   : function(XMLHttpRequest, textStatus, errorThrown) {},
            // just some things I've learned about json and the server
            // it maybe neccessary that the server provides the json mime type
            // in the HTTP header
            dataType: "json"
        });
        setTimeout(listen, 50);
    }

    this.set_canvas_and_run = function(html_id_str) {
        m_canvas  = document.getElementById(html_id_str);
        m_context = m_canvas.getContext("2d", { alpha: false, depth: false });
        m_context.scale(1, 1);
        // anything else to start up
        setTimeout(listen, 50);
        // starts the app
        run();
    };

    this.key_press = function(code) { 
        m_keyboard_controller.update_key_press(code);
        run();
    };

    this.key_release = function(code) {
        m_keyboard_controller.update_key_release(code);
        run();
    };

    this.mouse_move = function(loc) {
        m_mouse_controller.update_location(loc);
        run();
    }

    this.mouse_click = function() {
        m_mouse_controller.mouse_click(true );
        run();
    }
    
    this.mouse_release = function() {
        m_mouse_controller.mouse_click(false);
        run();
    }

    this.set_listen_target = function(target_address) {
        m_json_target = target_address;
        m_json_controller = new JsonAdapter();
        m_controllers.push(m_json_controller);
    }
    
    this.pause_execution  = function() { m_pause = true ; }
    this.resume_execution = function() { m_pause = false; }
}

var g_app;

// intending to modify global this
function start_app() {
    g_app = new App();
    g_app.set_canvas_and_run("main-canvas");
}
