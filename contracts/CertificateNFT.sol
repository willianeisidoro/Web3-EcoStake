// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() 
        ERC721("ESG Certificate", "ESGCERT") 
        Ownable(msg.sender) 
    {}

    function mintCertificate(address to, string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        return newTokenId;
    }
}