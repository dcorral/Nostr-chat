import { useEffect, useRef, useState } from "react";
import { Event, Relay, nip44 } from "nostr-tools";
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

function ChatRoom(props: {
  privKey: string;
  pubKey: string;
  recipientPubKey: string;
}) {
  const { privKey, pubKey, recipientPubKey } = props;
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
              kinds: [4],
              "#p": [pubKey, recipientPubKey],
              limit: 50,
            },
          ],
          {
            onevent: async (evt) => {
              if (!seenIdsRef.current.has(evt.id)) {
                seenIdsRef.current.add(evt.id);

                const senderPubKey = evt.tags.find(([k]) => k === "p")?.[1];
                console.log(senderPubKey);
                if (!senderPubKey) return;

                try {
                  const conversationKey =
                    senderPubKey === pubKey
                      ? nip44.getConversationKey(
                          secp.etc.hexToBytes(privKey),
                          recipientPubKey,
                        )
                      : nip44.getConversationKey(
                          secp.etc.hexToBytes(privKey),
                          senderPubKey,
                        );
                  const plaintext = nip44.decrypt(evt.content, conversationKey);
                  console.log(plaintext);
                  setMessages((old) =>
                    [
                      {
                        ...evt,
                        content: plaintext,
                      },
                      ...old,
                    ].sort((a, b) => b.created_at - a.created_at),
                  );
                } catch (err) {
                  console.error("Failed to decrypt message:", err);
                }
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
  }, []);

  async function sendMessage() {
    if (!relay || !privKey || !newMessage || newMessage === "") return;

    try {
      const conversationKey = nip44.getConversationKey(
        secp.etc.hexToBytes(privKey),
        recipientPubKey,
      );
      const ciphertext = nip44.encrypt(newMessage, conversationKey);

      const now = Math.floor(Date.now() / 1000);
      const baseEvent = {
        kind: 4,
        pubkey: pubKey,
        created_at: now,
        tags: [["p", recipientPubKey]], // Tag the recipient
        content: ciphertext,
      };
      const id = getEventHash(baseEvent);
      const sig = signEvent({ ...baseEvent, id }, privKey);

      const event: Event = {
        ...baseEvent,
        id,
        sig: secp.etc.bytesToHex(sig),
      };
      relay.publish(event);

      setNewMessage("");
    } catch (err) {
      console.error("Failed to encrypt message:", err);
    }
  }

  return (
    <div>
      <h3>Direct Message</h3>
      {!isConnected && (
        <p style={{ color: "red" }}>Relay is disconnected. Please reconnect.</p>
      )}
      <br />
      <input
        type="text"
        placeholder="Write a message"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        disabled={!isConnected}
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
