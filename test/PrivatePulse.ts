import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { PrivatePulse, PrivatePulse__factory } from "../types";

type Signers = {
  sender: HardhatEthersSigner;
  recipient: HardhatEthersSigner;
  other: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PrivatePulse")) as PrivatePulse__factory;
  const contract = (await factory.deploy()) as PrivatePulse;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("PrivatePulse", function () {
  let signers: Signers;
  let contract: PrivatePulse;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { sender: ethSigners[0], recipient: ethSigners[1], other: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("stores a message and lets the recipient decrypt the numeric key", async function () {
    const clearKey = 123456;
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.sender.address)
      .add32(clearKey)
      .encrypt();

    const ciphertext = "ciphertext::hello-recipient";

    const tx = await contract
      .connect(signers.sender)
      .sendMessage(signers.recipient.address, ciphertext, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const inboxCount = await contract.getInboxCount(signers.recipient.address);
    expect(inboxCount).to.eq(1n);

    const message = await contract.getInboxMessage(signers.recipient.address, 0);
    expect(message[0]).to.eq(signers.sender.address);
    expect(message[1]).to.eq(signers.recipient.address);
    expect(message[3]).to.eq(ciphertext);

    const decryptedKey = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      message[4],
      contractAddress,
      signers.recipient,
    );
    expect(Number(decryptedKey)).to.eq(clearKey);
  });

  it("tracks total messages", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.sender.address)
      .add32(654321)
      .encrypt();

    await contract
      .connect(signers.sender)
      .sendMessage(signers.recipient.address, "ciphertext::another", encryptedInput.handles[0], encryptedInput.inputProof);

    const total = await contract.totalMessages();
    expect(total).to.eq(1n);
  });
});
