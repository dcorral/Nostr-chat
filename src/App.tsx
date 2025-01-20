import { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import ChatRoom from "./components/ChatRoom";

function App() {
  const [privKey, setPrivKey] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [recipientPubKey, setRecipientPubKey] = useState("");

  return (
    <div>
      <ConnectWallet
        onKeys={(pKey: string, uKey: string) => {
          setPrivKey(pKey);
          setPubKey(uKey);
        }}
        onRecipientPubKey={(rPubKey: string) => {
          setRecipientPubKey(rPubKey);
        }}
      />
      {privKey && pubKey && recipientPubKey && (
        <ChatRoom
          privKey={privKey}
          pubKey={pubKey}
          recipientPubKey={recipientPubKey}
        />
      )}
    </div>
  );
}

export default App;
