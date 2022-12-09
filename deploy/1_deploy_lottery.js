const { network } = require("hardhat")
const { entranceFee } = require("./../hardhat-helper-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    await deploy("Lottery", {
        // contract: "Lottery",
        from: deployer,
        log: true,
        args: [entranceFee],
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("Lottery deployed!")
    log("-".repeat(50))
}

module.exports.tags = ["all", "lottery"]
