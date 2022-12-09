const { network } = require("hardhat")
const { entranceFee, developmentChains } = require("./../hardhat-helper-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        await deploy("VRFMock", {
            // contract: "VRFMock",
            from: deployer,
            log: true,
            args: [entranceFee],
            waitConfirmations: network.config.blockConfirmations || 1,
        })
        log("VRFMock deployed!")
        log("-".repeat(50))
    }
}

module.exports.tags = ["all", "mock"]
