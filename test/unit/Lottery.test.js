const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { entranceFee } = require("./../../hardhat-helper-config")
const { assert, except } = require("chai")

describe("Lottery", () => {
    let deployer
    let lottery
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        lottery = await ethers.getContract("Lottery", deployer)
    })
    describe("Constructor", () => {
        it("Should properly set the entrance fee", async () => {
            const currentFee = await lottery.getEntranceFee()
            assert.equal(entranceFee.toString(), currentFee.toString())
        })
    })
})
