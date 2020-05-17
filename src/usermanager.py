# This should not be part of the sqldatabase.py file
# because all methods there are exposed to the web interface

import sys
import json

from  sqlite3 import connect

from sqldatabase import FILE_PATH, ROOT_ID, user_exists, get_id, database_add_entry


def add_user(user_name):
    if user_exists(user_name):
        return None

    user_id = get_id()

    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'INSERT INTO users (id, name) VALUES(?, ?)'
        params = (user_id, user_name)
        cursor.execute(sql, params)
        return user_id

def remove_user(user_name):
    # TODO Implement. Also delete entries
    pass

def create_initial_entries(user_id, user_name):
    with open('template.json') as f:
        data = f.read()
        import_json(user_name, data)

def import_json(user_name, json_string):
    if not user_exists(user_name):
        return

    imported_data = json.loads(json_string)

    def work(parent_id, data):
        for key, child_data in data.items():
            new_id = database_add_entry(user_name, parent_id, key)
            if (new_id):
                print(f"    ADDED\t{parent_id}\t --> \t'{key}'")
                work(new_id, child_data)

    work(ROOT_ID, imported_data)

def cli_add_user():
    if len(sys.argv) < 3:
        print("Missing user names to create")
        return

    user_list = sys.argv[2:]

    for user_name in user_list:
        new_user_id = add_user(user_name)

        if new_user_id:
            print(f"User '{user_name}' added")
            create_initial_entries(new_user_id, user_name)
            print(f"Created initial entries for '{user_name}'")

        else:
            print(f"User '{user_name}' already exists")

def cli_import_json():
    try:
        json_file = sys.argv[2]
        print(f"Importing {json_file}")

        with open(sys.argv[2]) as f:
            data = f.read()
            import_json(json_file.replace('.json'), data)
    except IndexError:
        print("The json file name is missing!")
    except FileNotFoundError:
        print("The file does not exist!")

if __name__ == "__main__":
    actions = {
        'adduser': cli_add_user,
        'import': cli_import_json,
    }

    if len(sys.argv) < 2:
        print("Action missing. Possible actions are:")
        for key in actions:
            print(f"  {key}")
        sys.exit(-1)

    action_name = sys.argv[1]
    actions[action_name]()