import React, { useState } from "react";
import { schnorr } from "@noble/curves/secp256k1";

function ConnectWallet(props: {
  onKeys: (privHex: string, pubHex: string) => void;
}) {
  const [privKeyHex, setPrivKeyHex] = useState("");
  const [pubKeyHex, setPubKeyHex] = useState("");

  function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  function hexToBytes(hex: string) {
    if (!hex) return new Uint8Array();
    const len = hex.length;
    const data = new Uint8Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      data[i >> 1] = parseInt(hex.substring(i, i + 2), 16);
    }
    return data;
  }

  function handleGenerate() {
    const privKey = schnorr.utils.randomPrivateKey();
    const pubKey = schnorr.getPublicKey(privKey);
    const privHex = bytesToHex(privKey);
    const pubHex = bytesToHex(pubKey);
    setPrivKeyHex(privHex);
    setPubKeyHex(pubHex);
    props.onKeys(privHex, pubHex);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const keyHex = e.target.value.trim();
    if (!keyHex) {
      setPrivKeyHex("");
      setPubKeyHex("");
      props.onKeys("", "");
      return;
    }
    try {
      const privBytes = hexToBytes(keyHex);
      if (privBytes.length !== 32) throw new Error("Not 32-byte private key");
      const pubBytes = schnorr.getPublicKey(privBytes);
      const pubHex = bytesToHex(pubBytes);
      setPrivKeyHex(keyHex);
      setPubKeyHex(pubHex);
      props.onKeys(keyHex, pubHex);
    } catch (err) {
      console.error("Invalid key:", err);
    }
  }

  return (
    <div>
      <h3>Connect Wallet</h3>
      <button onClick={handleGenerate}>Generate Key</button>
      <div>Private Key: {privKeyHex}</div>
      <div>Public Key: {pubKeyHex}</div>
      <br />
      or
      <h3>Import your private key</h3>
      <input
        type="text"
        placeholder="Paste a 64-char hex private key"
        value={privKeyHex}
        onChange={handleImport}
      />
    </div>
  );
}

export default ConnectWallet;
