# System
import os
import asyncio
import json
import uuid

import websockets
import ssl
import pathlib

# Project
import sqldatabase as sql

# Configuration
ADDRESS = '0.0.0.0'
PORT = 8193

# Members
open_connections = set()

async def handle_messages(websocket, path): # Will be called once per established connection
    await register(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print(data)

            action = data.get('action')
            client_id = data.get('client_id')

            if action == 'login':
                status = 'success' if sql.user_exists(data['client_id']) else 'failed'

                await websocket.send(json.dumps({
                    'type': 'login_response',
                    'status': status
                }))
                continue

            if not client_id:
                print("No client ID provided, cancelling request...")
                continue

            if not sql.user_exists(client_id):
                print("You are not a registered user!")
                continue

            if hasattr(sql, action):
                func = getattr(sql, action)
                await func(websocket, data)
            else:
                print(action, "not supported!")

    except asyncio.streams.IncompleteReadError:
        print("IncompleteReadError")
    except websockets.exceptions.ConnectionClosed:
        print("ConnectionClosed")
    finally:
        await unregister(websocket)

async def register(websocket):
    open_connections.add(websocket)

    def _create_unique_socket_id():
        return uuid.uuid4().hex

    socket_id = _create_unique_socket_id()

    # Send initial response
    await websocket.send(json.dumps({
        'type': 'connection_established',
        'id': socket_id
    }))

    print(f"Connection established with {socket_id}")

async def send(websocket, data):
    await websocket.send(json.dumps(data))

async def unregister(websocket):
    open_connections.remove(websocket)

sql.initialize()

# Use SSL certificate
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
localhost_pem = pathlib.Path(__file__).with_name("localhost.pem")
ssl_context.load_cert_chain(localhost_pem)

websocket_server = websockets.serve(handle_messages, ADDRESS, PORT, ssl=ssl_context)

# Start server loop
print("Starting server on port " + str(PORT))
asyncio.get_event_loop().run_until_complete(websocket_server)
asyncio.get_event_loop().run_forever()
