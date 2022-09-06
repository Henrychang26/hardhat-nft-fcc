//SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "base64-sol/base64.sol";
import "hardhat/console.sol";

error ERC721Metadata_URI_QueryFor_NonExistenToke();

contract DynamicSvgNft is ERC721, Ownable {
    //Mint
    //store the SVG somewhere
    //some logic to say "Show X image" or "show Y Image"

    uint256 private s_tokenCounter;
    string private s_lowImageURI;
    string private s_highImageURI;
    // string private constant base64EncodedSvgPrefix = "data:image/svg+xnl;base64,";

    mapping(uint256 => int256) public s_tokenIdToHighValues;
    AggregatorV3Interface internal immutable i_priceFeed;

    event CreatedNFT(uint256 indexed tokenId, int256 highValue);

    constructor(
        address priceFeedAddress,
        string memory lowSvg,
        string memory highSvg
    ) ERC721("Dynamic SVG NFT", "DSN") {
        s_tokenCounter = 0;
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
        // i_lowImageURI = svgToImageURI(lowSvg);
        // i_highImageURI = svgToImageURI(highSvg);
        s_lowImageURI = svgToImageURI(lowSvg);
        s_highImageURI = svgToImageURI(highSvg);
    }

    function mintNft(int256 highValue) public {
        s_tokenIdToHighValues[s_tokenCounter] = highValue;
        _safeMint(msg.sender, s_tokenCounter); //check docs for params
        s_tokenCounter = s_tokenCounter + 1;
        emit CreatedNFT(s_tokenCounter, highValue);
    }

    function svgToImageURI(string memory svg) public pure returns (string memory) {
        //This function will spit out URL or URI
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));
        return string(abi.encodePacked(baseURL, svgBase64Encoded));
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) {
            revert ERC721Metadata_URI_QueryFor_NonExistenToke();
        }
        // require(!_exists(tokenId), "URI Query for nonexistent token"); //function from ERC721 contract
        // string memory imageURI = "Hi";

        //data:image/svg+xml;base64,  --prefix
        //data:application/json;base64,

        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        string memory imageURI = s_lowImageURI;
        if (price >= s_tokenIdToHighValues[tokenId]) {
            imageURI = s_highImageURI;
        }
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(), // can add whatever name here
                                '", "description":"An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function getLowSVG() public view returns (string memory) {
        return s_lowImageURI;
    }

    function getHighSVG() public view returns (string memory) {
        return s_highImageURI;
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
