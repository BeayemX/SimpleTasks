# System
import os
import asyncio
import json

# Pip
import websockets

# Configuration
ADDRESS = '0.0.0.0'
PORT = 8193

data_storage_path = "DataStorage"

# Members
open_connections = set()

if not os.path.exists(data_storage_path):
    os.mkdir(data_storage_path)

async def handle_messages(websocket, path): # Will be called once per established connection
    await register(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print(data)

            if data['action'] == 'login':
                status = 'success' if user_exists(data['client_id']) else 'failed'

                await websocket.send(json.dumps({
                    'type': 'login_response',
                    'status': status
                }))

            if not 'client_id' in data:
                print("No client ID provided, cancelling request...")
                continue

            client_id = data['client_id']

            if not file_exists(client_id):
                print("You are not a registered user!")
                continue


            if data['action'] == 'request_data':
                await update_data(websocket, client_id)
            elif data['action'] == 'add_entry':

                user_data, current_data = load_data(client_id)

                for path_part in data['path']:
                    current_data = current_data[path_part]

                # Avoid overwriting
                safe_name = get_overwrite_safe_name(data['text'], current_data)

                # Add data
                current_data[safe_name] = {}

                write_data(client_id, user_data)

                await update_data(websocket, client_id)

            elif data['action'] == 'delete_entry':
                delete_path = data['path']
                delete_element = delete_path[-1]
                delete_path = delete_path[:-1]

                user_data, current_data = load_data(client_id)

                for path_part in delete_path:
                    current_data = current_data[path_part]

                del current_data[delete_element]

                write_data(client_id, user_data)

                await update_data(websocket, client_id)


            elif data['action'] == 'rename_entry':
                rename_path = data['path']
                old_name = data['old']
                new_name = data['new']

                user_data, current_data = load_data(client_id)

                for path_part in rename_path:
                    current_data = current_data[path_part]

                current_data[new_name] = current_data[old_name]
                del current_data[old_name]

                write_data(client_id, user_data)

                await update_data(websocket, client_id)

            elif data['action'] == 'move_entry':
                working_path = data['path']
                current_index = data['currentIndex']
                target_index = data['newIndex']

                user_data, current_data = load_data(client_id)

                for path_part in working_path:
                    current_data = current_data[path_part]

                reordered_data = {}

                index_counter = 0
                cached_key = None
                for key in current_data:
                    # Moving selected entry up
                    if index_counter == target_index and not cached_key:
                        cached_key = key
                        index_counter += 1
                        continue

                    # Moving selected entry down
                    if index_counter == current_index and not cached_key:
                        cached_key = key
                        index_counter += 1
                        continue

                    reordered_data[key] = current_data[key]

                    if cached_key:
                        reordered_data[cached_key] = current_data[cached_key]

                    index_counter += 1

                try:
                    current_data = user_data
                    for path_part in working_path[:-1]:
                        current_data = current_data[path_part]

                    current_data[working_path[-1]] = reordered_data
                except IndexError: # working on root level
                    user_data = reordered_data

                write_data(client_id, user_data)
                await update_data(websocket, client_id)

            elif data['action'] == 'paste_data':
                paste_path = data['path']
                paste_name = data['data']['name']
                paste_data = data['data']['data']
                execute_cut = data['cut_data']['execute_cut']
                cut_path = data['cut_data']['path']

                # Read data
                user_data, current_data = load_data(client_id)

                ## Prepare cut data
                if execute_cut:
                    current_cut_data = current_data
                    for path_part in cut_path:
                        current_cut_data = current_cut_data[path_part]

                    # overwrite paste_data that was sent with actual values that are removed by cutting
                    paste_data = current_cut_data[paste_name]
                    del current_cut_data[paste_name]

                ## Prepare paste data
                current_paste_data = current_data

                for path_part in paste_path:
                    current_paste_data = current_paste_data[path_part]

                paste_name = get_overwrite_safe_name(paste_name, current_paste_data)
                current_paste_data[paste_name] = paste_data

                # Write data
                write_data(client_id, user_data)
                await update_data(websocket, client_id)




    except asyncio.streams.IncompleteReadError:
        print("IncompleteReadError")
    except websockets.exceptions.ConnectionClosed:
        print("ConnectionClosed")
    finally:
        await unregister(websocket)

async def register(websocket):
    open_connections.add(websocket)

    def _create_unique_socket_id():
        import uuid
        return uuid.uuid4().hex

    socket_id = _create_unique_socket_id()

    # Send initial response
    await websocket.send(json.dumps({
        'type': 'connection_established',
        'id': socket_id
    }))

    #await update_data(websocket, client_id)

    # Send current game state to new user
    # await websocket.send(gameserver.get_serialized_state())

    print(f"Connection established with {socket_id}")


async def send(websocket, data):
    await websocket.send(json.dumps(data))

async def unregister(websocket):
    open_connections.remove(websocket)


async def update_data(websocket, client_id):
    # Load user data
    user_data, client_data = load_data(client_id)

    await websocket.send(json.dumps({
        'type': 'update_data',
        'data': user_data
    }))


# # # # # #
# Helper  #
# # # # # #
def file_exists(client_id):
    try:
        with open(f"{data_storage_path}/{client_id}.json", 'r') as f:
            pass
    except:
        return False

    return True

def load_data(client_id):
    try:
        with open(f"{data_storage_path}/{client_id}.json", 'r') as f:
            user_data = json.load(f)
    except FileNotFoundError:
        user_data = {}
        with open(f"{data_storage_path}/{client_id}.json", 'a+') as f:
            json.dump(user_data, f)

    current_data = user_data

    return user_data, current_data # FIXME [Legacy] Returning the same object...

def write_data(client_id, new_user_data):
    # Use w+ if it should create for users
    with open(f"{data_storage_path}/{client_id}.json", 'w+') as f:
        json.dump(new_user_data, f, indent=4)

def get_overwrite_safe_name(target_name, data):
    contender = target_name
    or_new_text = target_name
    counter = 2
    while contender in data:
        contender = or_new_text + str(counter)
        counter += 1
    return contender

def user_exists(client_id):
    return file_exists(client_id)

# Start server loop
print("Starting server on port " + str(PORT))
asyncio.get_event_loop().run_until_complete(websockets.serve(handle_messages, ADDRESS, PORT))
asyncio.get_event_loop().run_forever()

