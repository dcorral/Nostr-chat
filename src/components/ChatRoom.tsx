import { useEffect, useRef, useState } from "react";
import { Event, Relay } from "nostr-tools";
import * as secp from "@noble/secp256k1";
import { schnorr } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

function getEventHash(event: Omit<Event, "id" | "sig">): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const hash = sha256(new TextEncoder().encode(serialized));
  return secp.etc.bytesToHex(hash);
}

function signEvent(
  event: Omit<Event, "sig"> & { id: string },
  privKeyHex: string,
) {
  const idBytes = secp.etc.hexToBytes(event.id);
  const skBytes = secp.etc.hexToBytes(privKeyHex);
  return schnorr.sign(idBytes, skBytes);
}

function ChatRoom(props: { privKey: string; pubKey: string }) {
  const { privKey, pubKey } = props;
  const [room, setRoom] = useState("my-channel");
  const [relay, setRelay] = useState<Relay | null>(null);
  const [messages, setMessages] = useState<Event[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());

  const connectToRelay = () => {
    setMessages([]);
    seenIdsRef.current.clear();

    Relay.connect("wss://relay.damus.io")
      .then((r) => {
        setRelay(r);
        setIsConnected(true);
        r.subscribe(
          [
            {
              kinds: [1],
              "#r": [room],
              limit: 50,
            },
          ],
          {
            onevent: (evt) => {
              if (!seenIdsRef.current.has(evt.id)) {
                seenIdsRef.current.add(evt.id);
                setMessages((old) => [evt, ...old]);
              }
            },
          },
        );
      })
      .catch(() => {
        console.error("Failed to connect to relay");
        setIsConnected(false);
      });
  };

  const disconnectRelay = () => {
    if (relay) {
      relay.close();
      setRelay(null);
      setIsConnected(false);
      console.log("Relay connection closed.");
    }
  };

  useEffect(() => {
    connectToRelay();
    return () => {
      if (relay) {
        relay.close();
      }
    };
  }, [room]);

  function sendMessage() {
    if (!relay || !privKey) return;
    const now = Math.floor(Date.now() / 1000);
    const baseEvent = {
      kind: 1,
      pubkey: pubKey,
      created_at: now,
      tags: [["r", room]],
      content: newMessage,
    };
    const id = getEventHash(baseEvent);
    const sig = signEvent({ ...baseEvent, id }, privKey);
    relay.publish({
      ...baseEvent,
      id,
      sig: secp.etc.bytesToHex(sig),
    });
    setNewMessage("");
  }

  return (
    <div>
      <h3>Nostr Chat Room</h3>
      {!isConnected && (
        <p style={{ color: "red" }}>Relay is disconnected. Please reconnect.</p>
      )}
      <label>Room: </label>
      <input
        type="text"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
        disabled={!isConnected} // Disable when relay is disconnected
      />
      <br />
      <br />
      <input
        type="text"
        placeholder="Write a message"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        disabled={!isConnected} // Disable when relay is disconnected
      />
      <button onClick={sendMessage} disabled={!isConnected}>
        Send
      </button>
      {isConnected ? (
        <button onClick={disconnectRelay}>Close Connection</button>
      ) : (
        <button onClick={connectToRelay}>Connect to Relay</button>
      )}
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>
            {msg.pubkey.slice(0, 8)}: {msg.content}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChatRoom;
