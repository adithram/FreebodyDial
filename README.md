<a href="https://zenhub.com"><img src="https://raw.githubusercontent.com/ZenHubIO/support/master/zenhub-badge.png"></a>


# FreebodyDial
Dial for free body diagram design. Designed for usability regardless of user disability. 

# Omega Release Insturction
- Launch canvas.html located in the templates directory.

# Beta Release Instructions
- Launch canvas.html located in the templates directory. 
- When editing: Line up square next to cursor with square near object to manipulate;
- When drawing polygons: To close polygon return cursor to starting point and click.
- When grouping: select lines, by clicking with pointer, you desire to group and hit done grouping when completed. Results will be seen if you click edit. 

# Alpha Release Instructions
- A terminal application has been designed to show sample user interaction and the creation/usage of JSON objects. The application lets the user interact through the keyboard describing movement. The keyboard functionality corresponds to movements that will eventually occur through a dial peripheral. The keyboard application will generate JSON objects. 

Terminal Application:

*If necessary, install pip using this link: https://pip.pypa.io/en/stable/installing/

1. Download/clone the GitHub repository. 

2. Open two terminal windows (which have bash).

3. In both windows, navigate to the GitHub repository

4. In both windows, run the bash script named "depend.sh" with the command "bash depend.sh" 

5. In both windows, create a virtual environment with "virtualenv venv"

6. In both windows, launch the virtual environment with "source venv/bin/activate"

7. In both windows, install the requirements file with "pip install -r requirements.txt"

8. In one terminal window, run the python file "app.py" with the command "python app.py"

9. In the second terminal window, run the python file "send.py" with the command "python send.py (If an error occurs here, exit the virtual environment, and run the command outside of the virtual environment in the same file location)

10. Usage: In the terminal window running "send.py" you can use "w", "a", "s", "d", "on", and "off" to signify movement. After each direction, push "enter" to send the motion. (i.e. "w" + "enter"). "on" or "off" switches the pen on or off. The second terminal window will indicate the json object recieved.

- A drawing application has been designed to allow the user to draw. Open the application and use your mouse to draw different line segments to create a free body diagram. 

Drawing Application: 

1. Navigate to the repository and into the templates folder. 

2. Open canvas.html in a browser window. 

3. Usage: Click and hold the mouse in the clicked position to draw a line primitive. Lift your finder off the clicked mouse to stop drawing. Click edit to enter edit mode. Click draw to enter draw mode. In addition you can group, ungroup and undo line primitives. (Bugs exist with grouping, ungrouping and undoing)

#Alpha Release Notes:
- The terminal creation of JSON objects and the front end web application has not been fully connected. The files have been written, and we are actively in the midst of debugging and completing the application in a manner such that the user draws on the canvas.html interface using the keyboard. Issues persist regarding latency and unit sizing the vectors. 
- The peripheral hardware device has not been received as of Sunday, February 19. Therefore, rather than making a terminal application functional through the peripheral, we have chosen to use a keyboard base design for the alpha release. The driver for the joystick has been written (adc_read.py) but requires active testing. 
- WebGL implementation was quickly scrapped due to the obvious success of a canvas based implementation. 
- Bugs still exist with the group, ungroup and undo feature. 


