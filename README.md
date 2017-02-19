<a href="https://zenhub.com"><img src="https://raw.githubusercontent.com/ZenHubIO/support/master/zenhub-badge.png"></a>


# FreebodyDial
Dial for free body diagram design. Designed for usability regardless of user disability. 

# Alpha Release Instructions
- A terminal application has been designed to show sample user interaction and the creation/usage of JSON objects. The application lets the user interact through the keyboard describing movement. The keyboard functionality corresponds to movements that will eventually occur through a dial peripheral. The keyboard application will generate JSON objects. 

Terminal Application:

*If necessary, install pip using this link: https://pip.pypa.io/en/stable/installing/

1. Download/clone the GitHub repository. 

2. Open two terminal windows.

3. In both windows, navigate to the GitHub repository

4. In both windows, run the bash script named "depend.sh" with the command "bash depend.sh"

5. In both windows, create a virtual environment with "virtualenv venv"

6. In both windows, launch the virtual environment with "source venv/bin/activate"

7. In both windows, install the requirements file with "pip install -r requirements.txt"

8. In one terminal window, run the python file "app.py" with the command "python app.py"

9. In the second terminal window, run the python file "send.py" with the command "python send.py

10. Usage: In the terminal window running "send.py" you can use "w", "a", "s", "d", "on", and "off" to signify movement. After each direction, push "enter" to send the motion. (i.e. "w" + "enter"). "on" or "off" switches the pen on or off. The second terminal window will indicate the json object recieved.

- A drawing application has been designed to allow the user to draw. Open the application and use your mouse to draw different line segments to create a free body diagram. 

Drawing Application: 

1. Navigate to the repository and into the templates folder. 

2. Open canvas.html in a browser window. 


