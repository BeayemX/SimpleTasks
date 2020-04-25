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

global_data = {
    "counter": 0
}

async def handle_messages(websocket, path): # Will be called once per established connection
    await register(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print(data)
            if data['action'] == 'increase':
                global_data['counter'] += 1
                await send(websocket, {'counter': global_data['counter']})
            elif data['action'] == 'decrease':
                global_data['counter'] -= 1
                await send(websocket, {'counter': global_data['counter']})


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
    await websocket.send(json.dumps({
        'type': 'connection_established',
        'id': socket_id,
    }))

    # Send current game state to new user
    # await websocket.send(gameserver.get_serialized_state())

    print(f"Connection established with {socket_id}")


async def send(websocket, data):
    await websocket.send(json.dumps(data))

async def unregister(websocket):
    open_connections.remove(websocket)

# Start server loop
print("Starting server on port " + str(PORT))
asyncio.get_event_loop().run_until_complete(websockets.serve(handle_messages, ADDRESS, PORT))

path = os.getcwd()
print(f"Server running on {path}/Frontend/index.html")
asyncio.get_event_loop().run_forever()
