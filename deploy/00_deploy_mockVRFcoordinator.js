const { network, ethers } = require("hardhat")
const { developmentChains } = require("./../hardhat-helper-config")

const BASE_FEE = ethers.utils.parseEther("0.25") // premium - 0.25 link per request
const GAS_PRICE_LINK = 1e9

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            // contract: "VRFCoordinatorV2Mock",
            from: deployer,
            log: true,
            args: args,
            waitConfirmations: network.config.blockConfirmations || 1,
        })
        log("VRFCoordinatorV2Mock deployed!")
        log("-".repeat(50))
    }
}

module.exports.tags = ["all", "mock"]
