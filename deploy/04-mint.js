const { ethers, network } = require("hardhat")

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    //Basic NFT
    const basicNft = await ethers.getContract("BasicNft", deployer) //retrieves contract
    const basicNftMintTx = await basicNft.mintNft() //calls the function
    await basicNftMintTx.wait(1) //wait 1 block confirmation
    console.log(`Basic NFT index 0 has tokenURI${await basicNft.tokenURI(0)}`)

    //random IPFS NFT
    const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
    const mintFee = await randomIpfsNft.getMintFee() //need to get mintFee before mint
    const randomIpfsNftMintTx = await randomIpfsNft.requestNft({ value: mintFee.toString() }) //request the NFT but NEED to pass a value  of mint fee
    const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1) //waits for the mint function to complete

    await new Promise(async (resolve, reject) => {
        //Check original contract for "Promise"--following is needed when "Promis" was used
        setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 300000) // 5 minute timeout time
        //set up listener for event
        randomIpfsNft.once("NftMinted", async function () {
            resolve()
        })
        if (chainId == 31337) {
            const requestId = randomIpfsNftMintTxReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.address)
        }
    })
    console.log(`Random IPFS NFT index 0 tokenURI: ${await randomIpfsNft.tokenURI(0)}`)

    //Dynamic SVG NFT
    const highValue = ethers.utils.parseEther("4000")
    const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer)
    const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue)
    await dynamicSvgNftMintTx.wait(1)
    console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`)
}

module.exports.tags = ["all", "mint"]
