# System
import os
import asyncio
import json

# Pip
import websockets

# Configuration
ADDRESS = '0.0.0.0'
PORT = 7777

# Members
open_connections = set()

async def handle_messages(websocket, path): # Will be called once per established connection
    await register(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print(data)
            if data['action'] == 'add_entry':
                with open("data.json") as f:
                    user_data = json.load(f)
                try:
                    current_data = user_data
                except KeyError:
                    user_data = {}
                    current_data = user_data

                for path_part in data['path']:
                    current_data = current_data[path_part]

                # Avoid overwriting
                safe_name = get_overwrite_safe_name(data['text'], current_data)

                # Add data
                current_data[safe_name] = {}

                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=4)

                await update_data(websocket)

            elif data['action'] == 'delete_entry':
                delete_path = data['path']
                delete_element = delete_path[-1]
                delete_path = delete_path[:-1]

                with open("data.json") as f:
                    user_data = json.load(f)
                try:
                    current_data = user_data
                except KeyError:
                    user_data = {}
                    current_data = user_data

                for path_part in delete_path:
                    current_data = current_data[path_part]

                del current_data[delete_element]


                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=4)

                await update_data(websocket)


            elif data['action'] == 'rename_entry':
                rename_path = data['path']
                old_name = data['old']
                new_name = data['new']

                user_data, current_data = load_data()

                for path_part in rename_path:
                    current_data = current_data[path_part]

                current_data[new_name] = current_data[old_name]
                del current_data[old_name]

                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=4)

                await update_data(websocket)

            elif data['action'] == 'move_entry':
                working_path = data['path']
                current_index = data['currentIndex']
                target_index = data['newIndex']

                user_data, current_data = load_data()

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

                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=4)
                await update_data(websocket)

            elif data['action'] == 'paste_data':
                paste_path = data['path']
                paste_name = data['data']['name']
                paste_data = data['data']['data']
                execute_cut = data['cut_data']['execute_cut']
                cut_path = data['cut_data']['path']

                # Read data
                user_data, current_data = load_data()

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
                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=4)
                await update_data(websocket)




    except asyncio.streams.IncompleteReadError:
        print("IncompleteReadError")
    except websockets.exceptions.ConnectionClosed:
        print("ConnectionClosed")
    finally:
        await unregister(websocket)

def load_data():
    with open("data.json") as f:
        user_data = json.load(f)
    try:
        current_data = user_data
    except KeyError:
        user_data = {}
        current_data = user_data

    return user_data, current_data

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

    await update_data(websocket)

    # Send current game state to new user
    # await websocket.send(gameserver.get_serialized_state())

    print(f"Connection established with {socket_id}")


async def send(websocket, data):
    await websocket.send(json.dumps(data))

async def unregister(websocket):
    open_connections.remove(websocket)


async def update_data(websocket):
    # Load user data
    with open("data.json") as f:
        user_data = json.load(f)

    await websocket.send(json.dumps({
        'type': 'update_data',
        'data': user_data
    }))


# # # # # #
# Helper  #
# # # # # #

def get_overwrite_safe_name(target_name, data):
    contender = target_name
    or_new_text = target_name
    counter = 2
    while contender in data:
        contender = or_new_text + str(counter)
        counter += 1
    return contender

# Start server loop
print("Starting server on port " + str(PORT))
asyncio.get_event_loop().run_until_complete(websockets.serve(handle_messages, ADDRESS, PORT))

path = os.getcwd()
print(f"Server running on {path}/Frontend/index.html")
asyncio.get_event_loop().run_forever()

