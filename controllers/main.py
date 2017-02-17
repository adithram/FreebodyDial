from flask import *


main = Blueprint('main', __name__, template_folder='templates')


@main.route('/', methods=["GET", "POST"])
def main_route():

    session['direction_count'] = 1
    
    # direction_count = 1
    # direction = "none"
    # previous_direction = "no"

    if request.method == "GET":
        return render_template("index.html")


    if request.method == "POST":
        # Grab JSON object
        content = request.json

        #Set previous direction to none. If direction is not a key, this will persist as previous_direction
        previous_direction = "none"

        # Check if direction is a key. If it is, this is not th first movement. Set previous direction to previous movement
        if 'direction' in session.keys():
            print("Session direction one: " + session['direction'] + "\n")
            previous_direction = session['direction']

        # Grab current direction from JSON object    
        current_direction = content['direction']

        # Add current direction to the session. Overwrite if session direction already exists.
        session['direction'] = current_direction

        # Temporary check
        if 'direction' in session.keys():
            print("Session direction one: " + session['direction'] + "\n")

        # Grab click condition from JSON object
        click_on = content['click_on']

        # Check if the click is on.
        if click_on:
            print ("Current direction: " + current_direction + " \nPrevious Direction: " + previous_direction + "\n")
            # Check if the current direction is equivalent to the previous direction
            if current_direction == previous_direction:
                print("in conditional")
                # increment if same as previous direction
                session['direction_count'] += 1
            else:
                # Overwrite if new direction
                session['direction_count'] = 1;

        if click_on:
            print("Going " + current_direction + " for " + str(session['direction_count']) + " units with pen on\n")
        else:
            print("No movement. Pen is off.")

           

        print("Session direction: " + session['direction'] + "\n")








        # content = request.json
        # print ("wow")
        # print (content['direction'])
        # print ("it worked")
        # options would contain direction and duration
        return render_template("index.html")



