const { assert } = require("chai")
const { network, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT Unit Tests", function () {
          let basicNft, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners() //calling address from ethers
              deployer = accounts[0] //deployer at index 0, also owner
              await deployments.fixture(["basicnft"]) //deploys contract
              basicNft = await ethers.getContract("BasicNft") //retrieving contract using ethers
          })
          describe("Constructor", () => {
              it("Initialized the NFT correctly", async () => {
                  const name = await basicNft.name() //constructors from original contract
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert.equal(name, "Dogie") //should match in constructor in original contract
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })
          describe("Mint NFT", () => {
              it("Allows users to mint and NFT, and updates appropriately", async () => {
                  const txResponse = await basicNft.mintNft() //mints 1 NFT
                  await txResponse.wait(1) //wait one block confirmation
                  const tokenURI = await basicNft.tokenURI(0) //Get URI using original contract function
                  const tokenCounter = await basicNft.getTokenCounter() // calling tokenCounter using original contract function

                  assert.equal(tokenCounter.toString(), "1") //counter should 1 after 1 mint
                  assert.equal(tokenURI, await basicNft.TOKEN_URI()) //token URI is a CONSTANT as declared in original contract
              })
          })
      })
