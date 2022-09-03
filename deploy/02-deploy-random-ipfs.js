const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { storeImages } = require("../utils/uploadToPinata")
const { verify } = require("../utils/verify")

const imagesLocation = "./images/randomNft"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let tokenUris

    //get the IPFS hashes of our images
    //few ways to do this
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris() //create a function at bottom
    }

    //1. With our own IPFS node. read docs
    //2. Pinata -website you pay to help pin NFT for you
    //3. nft.storage

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        //development chain
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription() //create subscription
        const txReceipt = await tx.wait(1) //wait one block confirmation
        subscriptionId = txReceipt.events[0].args.subId //retrieve subid from even with args
    } else {
        vrfCoordinatorV2Address = networkConfig[chainid].vrfCoordinatorV2 //Real network
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("-----------")
    await storeImages(imagesLocation)
    // const args = [
    //     vrfCoordinatorV2Address,
    //     subscriptionId,
    //     networkConfig[chainId].gasLane,
    //     networkConfig[chainId].callbackGasLimit,
    //     //tokenUris,
    //     networkConfig[chainId].mintFee,
    // ]
}

async function handleTokenUris() {
    tokenUris = []
    //Need the following
    //store the image on IPFS
    //Store the metadata in IPFS

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
