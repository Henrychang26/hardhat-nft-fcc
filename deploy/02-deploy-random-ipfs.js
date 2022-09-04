const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")
const { verify } = require("../utils/verify")

const imagesLocation = "./images/randomNft"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

let tokenUris = [
    "ipfs://QmeFr7Qj5d3M3dNxEpvfbHTobVWqUmcTDsg9dACaDokmST",
    "ipfs://QmeYjhq5WGWzDuNL6XXtVzPNUxWtnN4TrV1VY37Hpkz3ku",
    "ipfs://QmS7TMKqnvNLv2NZXQsh7qYFtskDcTBe1njPd64axe1dRq",
]

const FUND_AMOUNT = "1000000000000000000000" //10 LINK ethers.parseUnit

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

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
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2 //Real network
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("-----------")

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("--------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }
}

async function handleTokenUris() {
    tokenUris = []
    //Need the following
    //store the image on IPFS
    //Store the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    //responses takes a list of imageUploadResponses and files
    for (imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        //upload the metadata
        let tokenUriMetadata = { ...metadataTemplate } // ...is a javescript syntax, means unpack//metadataTemplate from above
        //files are pug.png, st-bernard.png, shiba-inu.png
        //replace the .png so the names are pug, st.bernard and shiba-inu
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `An adroable ${tokenUriMetadata.name} pup!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}` //check pinata docs
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        //store the JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs Uploaded! They are:")
    console.log(tokenUris)

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
