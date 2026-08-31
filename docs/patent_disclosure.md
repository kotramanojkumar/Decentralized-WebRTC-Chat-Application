# Patent / Invention Disclosure Form

## 1. Title of Invention
Client-Side Context-Aware Security Engine for Decentralized WebRTC Communication

## 2. Inventors
[Student Name]

## 3. Background / Prior Art
Current enterprise communication platforms (e.g., Slack, Microsoft Teams, Signal) rely heavily on centralized servers for Data Loss Prevention (DLP) and security policy enforcement. When a user sends a message, it is transmitted to a central server, which decrypts it (or uses homomorphic/server-side scanning), evaluates it against organizational policies, and then applies restrictions. This centralized approach introduces privacy risks, single points of failure, and latency, and violates true zero-trust end-to-end encryption (E2EE).

## 4. Problem Solved
How to enforce dynamic security policies (such as preventing file downloads or forcing message auto-deletion) based on the contextual sensitivity of a conversation, *without* allowing a centralized server to read the communication.

## 5. Description of the Invention
The invention is an Adaptive Intelligent Security Engine that operates entirely on the client (browser/device) within a peer-to-peer WebRTC network. 
When a user drafts a message:
1. A local AI inference engine (running in an isolated Web Worker via WebAssembly) analyzes the text for sensitive keywords or confidential context.
2. The engine classifies the message risk level (e.g., NORMAL, CONFIDENTIAL).
3. Based on the classification, the client dynamically alters the cryptographic and transmission parameters of the WebRTC DataChannel *before* the message is encrypted and sent. 
4. For example, if classified as CONFIDENTIAL, the sender's client automatically attaches a short Time-To-Live (TTL) metadata tag and encrypts the payload via AES-GCM. 
5. The receiving client decrypts the payload and inherently honors the TTL, purging the message from local memory upon expiry.

## 6. Novelty & Non-Obviousness
The combination of *local, on-device NLP inference* to drive *dynamic WebRTC DataChannel cryptographic parameters* in real-time is novel. It shifts the entire DLP paradigm from the server to the edge, maintaining absolute E2EE while still satisfying enterprise compliance and security policy requirements.

## 7. Commercial Potential
Can be licensed to secure communication startups, telemedicine platforms requiring HIPAA compliance without central logging, and enterprise WebRTC solutions.
