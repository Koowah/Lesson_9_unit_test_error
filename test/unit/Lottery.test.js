const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { networkConfig, developmentChains } = require("./../../hardhat-helper-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
          let deployer
          let lottery, vrfCoordinatorV2Mock
          const chainId = network.config.chainId
          const currentNetwork = networkConfig[chainId]
          const { interval, entranceFee, gasLane } = currentNetwork

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              lottery = await ethers.getContract("Lottery", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
          })
          describe("Constructor", () => {
              it("properly sets all parameters", async () => {
                  // Ideally we make our tests have just 1 assert per "it"

                  const deployed_lotteryState = await lottery.getLotteryState()
                  const deployed_interval = await lottery.getInterval()
                  const deployed_entranceFee = await lottery.getEntranceFee()
                  const deployed_gasLane = await lottery.getGasLane()
                  const deployed_callbackGasLimit = await lottery.getCallbackGasLimit()
                  assert.equal(deployed_lotteryState.toString(), "0")
                  assert.equal(deployed_interval.toString(), interval.toString())
                  assert.equal(deployed_entranceFee.toString(), entranceFee.toString())
                  assert.equal(deployed_gasLane.toString(), gasLane.toString())
                  assert.equal(
                      deployed_callbackGasLimit.toString(),
                      currentNetwork.callbackGasLimit.toString()
                  )
              })
          })
          describe("Enter lottery", () => {
              it("reverts if entrance fee too small", async () => {
                  await expect(
                      lottery.enterLottery({ value: ethers.utils.parseEther("0.01") })
                  ).to.be.revertedWith("Lottery__NotEnoughETH")
              })
              it("reverts if lottery calculating", async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  await network.provider.send("evm_increaseTime", [+interval + 1])
                  await network.provider.send("evm_mine", [])
                  // pretend to be chainlink keeper
                  await lottery.performUpkeep([])
                  await expect(lottery.enterLottery({ value: entranceFee })).to.be.revertedWith(
                      "Lottery__NotOpen"
                  )
              })
              it("records players when they enter", async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  assert.equal(await lottery.getPlayer(0), deployer)
              })
              it("emits event on enter", async () => {
                  await expect(
                      lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  ).to.emit(lottery, "LotteryEntered")
              })
          })
      })
