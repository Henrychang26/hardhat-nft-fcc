//SPDX-License-identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpdsNft__NeedMoreEthSent();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    //when we mint an NFT, we will trigger a Chainlink VRF call to get us a random number
    //using that number, we will get a random NFT
    //Pug, shiba inu, St. Bernard
    //pug super rare
    //shiba sort of rare
    //St Bernard common

    //uses pay to mint an NFT/
    //The owner of the contract withdraw the ETH

    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator; //Need to add as global variable
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    //VRF Helpers

    mapping(uint256 => address) public s_requestIdToSender;
    //Mapping allows fulfillRandomWords() to be able match requestId with whoever call the requestNft()

    //NFT Variables

    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenUris;
    uint256 internal i_mintFee;

    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2, //add the immutable variables here^
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        //Need to give ERC721 a name and symbol
        //need address then pass into VRFConsumerBaseV2 param
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenUris = dogTokenUris;
        i_mintFee = mintFee;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIpdsNft__NeedMoreEthSent();
        }
        //declares requestId here
        requestId = i_vrfCoordinator.requestRandomWords( //calling the function from vrfCoordinator-need to insert params from docs/variables declared above
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender; //from mapping above, add msg.sender to the array of s_requestIdToSender
        emit NftRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address dogOwner = s_requestIdToSender[requestId]; //when chainlink nodes calls...see above explanation
        uint256 newTokenId = s_tokenCounter; //New token id is called using s_tokenCounter declared above
        //What does this token look like?
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        //0-99
        //7 > Pug
        //88 >St. Bernard
        //45 >St. Bernard
        //12 > Shiba

        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        _safeMint(dogOwner, newTokenId); //Mint takes 2 params
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwner);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}(""); //msg.sender is owner to call amount as declared above
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        //function params from above and Breed(Enum)
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray(); //calling function below to get chance
        //moddedRng = 25
        //i = 0
        //cumulativeSum = 0
        for (uint256 i = 0; i < chanceArray.length; i++) {
            //for loop
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                //to make sure the number is between 0-99
                return Breed(i); //returns breed
            }
            cumulativeSum += chanceArray[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        //The array represents different chances of different dogs
        return [10, 30, MAX_CHANCE_VALUE]; //index 0 has 10% chance of happening, index 1 has 20% of happening (30-10)
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
