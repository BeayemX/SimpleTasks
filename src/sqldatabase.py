import os
import time
import json
import uuid

from sqlite3 import connect

# Configuration
DATABASE_FILE = "database.db"
FILE_PATH = os.path.dirname(os.path.realpath(__file__)) + "/" + DATABASE_FILE
ROOT_ID = "root"

## Testing
RECREATE_ENTRIES = True
RECREATE_ENTRIES = False

# # # # # # #
# Interface #
# # # # # # #
async def add_entry(websocket, data):
    client_id = data['client_id']
    parent_id = data['parent_id']
    text = data['text']

    if not parent_id:
        parent_id = ROOT_ID

    new_entry_id = database_add_entry(client_id, parent_id, text)

    if new_entry_id == None:
        await websocket.send(json.dumps({
            'type': 'error',
            'message': "Could not add entry"
        }))
    else:
        new_entry_data = create_data_for_entry(client_id, parent_id, new_entry_id)
        await websocket.send(json.dumps({
            'type': 'adding_successful',
            'new_entry': new_entry_data
        }))

async def change_text(websocket, data):
    client_id = data['client_id']
    entry_id = data['entry_id']
    text = data['text']

    database_rename_entry(client_id, entry_id, text)

    await websocket.send(json.dumps({
        'type': 'change_text_successful',
        'entry_id': entry_id,
        'text': text
    }))

async def move_entry(websocket, data):
    client_id = data['client_id']
    entry_id = data['entry_id']
    delta = data['delta']

    success = move_entry_in_database(client_id, entry_id, delta)

    await websocket.send(json.dumps({
        'type': 'move_entry_response',
        'success': success,
        'entry_id': entry_id,
        'delta': delta
    }))
    list_all_entries_for_user(client_id)

async def delete_entry(websocket, data):
    client_id = data['client_id']
    entry_id = data['entry_id']

    deleted_ids = delete_entry_from_database(client_id, entry_id)

    await websocket.send(json.dumps({
        'type': 'delete_successful',
        'deleted_entry_ids': deleted_ids
    }))

async def request_data(websocket, data):
    client_id = data['client_id']
    entry_id = ROOT_ID

    hierarchical_data = get_entry_data_recursivly(client_id, entry_id)

    await websocket.send(json.dumps({
        'type': 'update_data',
        'data': hierarchical_data
    }))

async def paste_entry(websocket, data):
    client_id = data['client_id']
    entry_id = data['entry_id']
    target_id = data['target_id']
    clipboard_type = data['type'] # cut | copy

    if clipboard_type == 'cut':
        old_parent_id = cut_paste_entry_in_database(client_id, entry_id, target_id)

        await websocket.send(json.dumps({
            'type': 'cut_paste_successful',
            'entry_id': entry_id,
            'old_parent_id': old_parent_id,
            'new_parent_id': target_id,
            'clipboard_type': clipboard_type
        }))
    """
    elif clipboard_type == 'copy':
        new_root_id = copy_paste_entry_in_database(client_id, entry_id, target_id)

        await websocket.send(json.dumps({
            'type': 'copy_paste_successful',
            'new_root_id': new_root_id,
            'new_parent_id': target_id,
            'copied_entry_id': entry_id,
            'clipboard_type': clipboard_type
        }))
    """


# # # # # # #
# Database  #
# # # # # # #
def setup_database():
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()

        if RECREATE_ENTRIES:
            cursor.execute('DROP TABLE IF EXISTS data')
            cursor.execute('DROP TABLE IF EXISTS users')

        cursor.execute('CREATE TABLE IF NOT EXISTS data (entry_id STRING, text STRING, client_id STRING, parent_id STRING, priority INTEGER)')
        cursor.execute('CREATE TABLE IF NOT EXISTS users (id STRING, name STRING)')

def user_exists(user_name):
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT * FROM users WHERE name=?'
        params = (user_name, )
        cursor.execute(sql, params)

        return len(cursor.fetchall()) > 0


def database_add_entry(client_id, parent_id, text):
    children_of_parent = get_children_for(client_id, parent_id)

    with connect(FILE_PATH) as conn:
        entry_id = get_id()

        cursor = conn.cursor()
        sql = 'INSERT INTO data (client_id, entry_id, text, parent_id, priority) VALUES(?, ?, ?, ?, ?)'
        params = (client_id, entry_id, text, parent_id, len(children_of_parent))
        cursor.execute(sql, params)

        return entry_id

def database_rename_entry(client_id, entry_id, text):
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'UPDATE data SET text=? WHERE client_id=? AND entry_id=?'
        params = (text, client_id, entry_id)
        cursor.execute(sql, params)

        return entry_id

def get_entry_data_recursivly(client_id, entry_id):
    data = create_data_for_entry(client_id, None, entry_id)
    _iterate_children_entries(client_id, data, entry_id)
    return data

def create_data_for_entry(client_id, parent_id, child_id):
    return {
        "id": child_id,
        'text': get_text_for_id(client_id, child_id),
        'labels': [],
        'entries': [],
        'parent_id': parent_id
    }

def _iterate_children_entries(client_id, parent_data, parent_id):
    for child_id in get_children_for(client_id, parent_id):
        data = create_data_for_entry(client_id, parent_id, child_id)

        _iterate_children_entries(client_id, data, child_id)
        parent_data['entries'].append(data)

def get_children_for(client_id, parent_id):
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT entry_id FROM data WHERE client_id=? AND parent_id=? ORDER BY priority ASC'
        params = (client_id, parent_id)
        cursor.execute(sql, params)

        all_ids = cursor.fetchall()

        if len(all_ids) > 0:
            return [x[0] for x in all_ids]

        return []

def get_text_for_id(client_id, entry_id):
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT text FROM data WHERE client_id=? AND entry_id=?'
        params = (client_id, entry_id)
        cursor.execute(sql, params)
        the_one = cursor.fetchone()
        if the_one != None:
            return the_one[0]

    return None

def move_entry_in_database(client_id, entry_id, delta):
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = "SELECT parent_id, priority FROM data WHERE client_id=? AND entry_id=?"
        params = (client_id, entry_id)
        cursor.execute(sql, params)
        row = cursor.fetchone()

        parent_id = row[0]
        current_priority = row[1]

    parent_subtasks = get_children_for(client_id, parent_id)
    subtasks_length = len(parent_subtasks)

    target_priority = max(0, min(subtasks_length - 1, current_priority + delta))

    if current_priority == target_priority:
        return False

    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        # XXX This only works when shifting elements by 1

        # Move other entry to new place
        sql = "UPDATE data SET priority=? WHERE client_id=? AND priority=?"
        params = (current_priority, client_id, target_priority)
        cursor.execute(sql, params)

        # Move selected entry to target place
        sql = "UPDATE data SET priority=? WHERE client_id=? AND entry_id=?"
        params = (target_priority, client_id, entry_id)
        cursor.execute(sql, params)

    return True

def delete_entry_from_database(client_id, entry_id):
    deleted_ids = []
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        def delete_recursivly(parent_id):
            deleted_ids.append(parent_id)

            # Print deleted entry to be able to "restore" accidently deleted entries
            sql = "SELECT parent_id, entry_id, text FROM data WHERE client_id=? AND entry_id=?"
            params = (client_id, parent_id)
            cursor.execute(sql, params)
            print("DELETED\t", "\t".join(cursor.fetchone()))

            for child_id in get_children_for(client_id, parent_id):
                delete_recursivly(child_id)

            sql = "DELETE FROM data WHERE client_id=? AND entry_id=?"
            params = (client_id, parent_id)
            cursor.execute(sql, params)

        delete_recursivly(entry_id)

    list_all_entries_for_user(client_id)

    return deleted_ids

def cut_paste_entry_in_database(client_id, entry_id, target_id):
    children_of_parent = get_children_for(client_id, target_id)

    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT parent_id FROM data WHERE client_id=? AND entry_id=?'
        params = (client_id, entry_id)
        cursor.execute(sql, params)
        old_parent_id = cursor.fetchone()[0]

        sql = 'UPDATE data SET parent_id=?, priority=? WHERE client_id=? AND entry_id=?'
        params = (target_id, len(children_of_parent), client_id, entry_id)
        cursor.execute(sql, params)

        return old_parent_id
"""
def copy_paste_entry_in_database(client_id, entry_id, target_id):
    hierarchical_data = get_entry_data_recursivly(client_id, entry_id)
    print(json.dumps(hierarchical_data, indent=2))

    all_new_ids = []
    def add_copy(new_parent_id, to_copy_entry_id, to_copy_entry_data):
        local_new_entry_id = database_add_entry(client_id, new_parent_id, to_copy_entry_data['text'])
        all_new_ids.append(local_new_entry_id)

        for child_entry_id, child_entry_data in to_copy_entry_data['entries'].items():
            add_copy(local_new_entry_id, child_entry_id, child_entry_data)

    add_copy(target_id, entry_id, hierarchical_data)

    return all_new_ids[0] # return new root element
"""


# # # # # # # # # # #
#  Helper functions #
# # # # # # # # # # #

def get_id():
    return uuid.uuid4().hex

def list_all_entries_for_user(client_id):
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT parent_id, entry_id, text FROM data WHERE client_id=? ORDER BY priority ASC'
        params = (client_id, )
        cursor.execute(sql, params)

        print(" [ Data ] ")
        for l in cursor.fetchall():
            print(l)

def list_all():
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT client_id, parent_id, entry_id, text FROM data ORDER BY priority ASC'
        cursor.execute(sql)

        print(" [ Data ] ")
        for l in cursor.fetchall():
            print(l)

def list_users():
    with connect(FILE_PATH) as conn:
        cursor = conn.cursor()
        sql = 'SELECT * FROM users'
        cursor.execute(sql)

        print(" [ Users ] ")
        for l in cursor.fetchall():
            print(l)

def initialize():
    setup_database()
    list_all()
    list_users()
