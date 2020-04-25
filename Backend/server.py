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
                new_text = data['text']
                or_new_text = new_text
                counter = 2
                while new_text in current_data:
                    new_text = or_new_text + str(counter)
                    counter += 1

                # Add data
                current_data[new_text] = {}

                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=2)

                await update_data(websocket)

            elif data['action'] == 'delete_entry':
                delete_path = data['path']
                delete_element = delete_path[-1]
                delete_path = delete_path[:-1]

                print("will delete", delete_element, "from", delete_path)

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
                    json.dump(user_data, f, indent=2)

                await update_data(websocket)


            elif data['action'] == 'rename_entry':
                rename_path = data['path']
                old_name = data['old']
                new_name = data['new']

                user_data, current_data = load_data()

                for path_part in rename_path:
                    current_data = current_data[path_part]

                print("before")
                print(json.dumps(current_data, indent=2))

                current_data[new_name] = current_data[old_name]
                del current_data[old_name]

                print("after")
                print(json.dumps(current_data, indent=2))

                with open("data.json", 'w') as f:
                    json.dump(user_data, f, indent=2)

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

# Start server loop
print("Starting server on port " + str(PORT))
asyncio.get_event_loop().run_until_complete(websockets.serve(handle_messages, ADDRESS, PORT))

path = os.getcwd()
print(f"Server running on {path}/Frontend/index.html")
asyncio.get_event_loop().run_forever()

