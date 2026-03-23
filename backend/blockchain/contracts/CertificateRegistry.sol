// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertificateRegistry {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    struct CertificateRecord {
        bytes32 certHash;
        bytes32 previousHash;
        bytes32 recipientIdHash;
        uint256 issuedAt;
        address issuer;
        bool exists;
        bool revoked;
    }

    mapping(bytes32 => CertificateRecord) private certificates;

    event CertificateIssued(
        bytes32 indexed certHash,
        bytes32 indexed previousHash,
        bytes32 indexed recipientIdHash,
        uint256 issuedAt,
        address issuer
    );

    event CertificateRevoked(bytes32 indexed certHash, address indexed revoker);

    function issueCertificate(
        bytes32 certHash,
        bytes32 previousHash,
        bytes32 recipientIdHash,
        uint256 issuedAt
    ) external onlyOwner {
        require(certHash != bytes32(0), "Invalid cert hash");
        require(!certificates[certHash].exists, "Certificate already exists");

        certificates[certHash] = CertificateRecord({
            certHash: certHash,
            previousHash: previousHash,
            recipientIdHash: recipientIdHash,
            issuedAt: issuedAt,
            issuer: msg.sender,
            exists: true,
            revoked: false
        });

        emit CertificateIssued(certHash, previousHash, recipientIdHash, issuedAt, msg.sender);
    }

    function revokeCertificate(bytes32 certHash) external onlyOwner {
        require(certificates[certHash].exists, "Certificate not found");
        require(!certificates[certHash].revoked, "Already revoked");

        certificates[certHash].revoked = true;
        emit CertificateRevoked(certHash, msg.sender);
    }

    function getCertificate(bytes32 certHash)
        external
        view
        returns (
            bytes32 _certHash,
            bytes32 _previousHash,
            bytes32 _recipientIdHash,
            uint256 _issuedAt,
            address _issuer,
            bool _exists,
            bool _revoked
        )
    {
        CertificateRecord memory cert = certificates[certHash];

        return (
            cert.certHash,
            cert.previousHash,
            cert.recipientIdHash,
            cert.issuedAt,
            cert.issuer,
            cert.exists,
            cert.revoked
        );
    }
}
