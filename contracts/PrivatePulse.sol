// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivatePulse
/// @notice Store encrypted messages and encrypted numeric keys using Zama FHE.
/// A sender encrypts a 6-digit key client-side, sends it alongside an
/// off-chain-encrypted message, and the recipient can decrypt the key via ACL.
contract PrivatePulse is ZamaEthereumConfig {
    struct Message {
        address sender;
        address recipient;
        uint256 timestamp;
        string encryptedBody;
        euint32 encryptedKey;
    }

    Message[] private _messages;
    mapping(address => uint256[]) private _inbox;

    event MessageSent(
        uint256 indexed messageId,
        address indexed sender,
        address indexed recipient,
        uint256 timestamp,
        string encryptedBody
    );

    /// @notice Save a new encrypted message and grant decrypt permissions for the key.
    /// @param recipient message recipient
    /// @param encryptedBody off-chain encrypted message content
    /// @param encryptedKeyInput encrypted numeric key provided by the relayer
    /// @param inputProof Zama input proof
    /// @return messageId the stored message id
    function sendMessage(
        address recipient,
        string calldata encryptedBody,
        externalEuint32 encryptedKeyInput,
        bytes calldata inputProof
    ) external returns (uint256 messageId) {
        require(recipient != address(0), "Invalid recipient");
        require(bytes(encryptedBody).length > 0, "Empty message");

        euint32 encryptedKey = FHE.fromExternal(encryptedKeyInput, inputProof);

        // Persist ACL so both parties can request user decryption later.
        FHE.allowThis(encryptedKey);
        FHE.allow(encryptedKey, recipient);
        FHE.allow(encryptedKey, msg.sender);

        messageId = _messages.length;
        _messages.push(
            Message({
                sender: msg.sender,
                recipient: recipient,
                timestamp: block.timestamp,
                encryptedBody: encryptedBody,
                encryptedKey: encryptedKey
            })
        );

        _inbox[recipient].push(messageId);

        emit MessageSent(messageId, msg.sender, recipient, block.timestamp, encryptedBody);
    }

    /// @notice Total messages in a recipient inbox.
    function getInboxCount(address recipient) external view returns (uint256) {
        return _inbox[recipient].length;
    }

    /// @notice Get a specific inbox entry for a recipient.
    function getInboxMessage(
        address recipient,
        uint256 index
    )
        external
        view
        returns (address sender, address recipientAddress, uint256 timestamp, string memory encryptedBody, euint32 encryptedKey)
    {
        require(index < _inbox[recipient].length, "Index out of bounds");
        uint256 messageId = _inbox[recipient][index];
        Message storage messageData = _messages[messageId];
        return (messageData.sender, messageData.recipient, messageData.timestamp, messageData.encryptedBody, messageData.encryptedKey);
    }

    /// @notice Get a message by its id.
    function getMessage(
        uint256 messageId
    )
        external
        view
        returns (address sender, address recipient, uint256 timestamp, string memory encryptedBody, euint32 encryptedKey)
    {
        require(messageId < _messages.length, "Invalid message");
        Message storage messageData = _messages[messageId];
        return (messageData.sender, messageData.recipient, messageData.timestamp, messageData.encryptedBody, messageData.encryptedKey);
    }

    /// @notice Total messages stored globally.
    function totalMessages() external view returns (uint256) {
        return _messages.length;
    }
}
