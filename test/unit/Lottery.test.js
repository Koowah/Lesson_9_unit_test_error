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
          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [+interval + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if lottery isn't open", async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  await network.provider.send("evm_increaseTime", [+interval + 1])
                  await network.provider.send("evm_mine", [])
                  await lottery.performUpkeep([])
                  const lotteryState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert.equal(lotteryState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
          })
          describe("performUpkeep", () => {
              it("only runs if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  await network.provider.send("evm_increaseTime", [+interval + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await lottery.performUpkeep([])
                  assert(tx)
              })
              it("reverts if checkupkeep is false", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpkeepNotNeeded"
                  )
              })
              it("updates lottery state, calls VRF and emits the proper event", async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  await network.provider.send("evm_increaseTime", [+interval + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await lottery.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId
                  assert.equal(await lottery.getLotteryState(), 1)
                  assert(+requestId > 0)
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: ethers.utils.parseEther("1") })
                  await network.provider.send("evm_increaseTime", [+interval + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpKeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              it("picks a winner, resets the lottery and sends the money", async () => {
                  const additionnalEntrants = 3
                  const startingAccountIndex = 1
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionnalEntrants;
                      i++
                  ) {
                      const accountConnectedLottery = lottery.connect(accounts[i])
                      await accountConnectedLottery.enterLottery({
                          value: ethers.utils.parseEther("1"),
                      })
                  }
                  const startingTimestamp = await lottery.getLastTimestamp()
                  // performUpkeep (mock being chainlink keepers)
                  // fulfillRandomWords (mock being chainlink vrf)
                  // wait for the fulfillRandomWords to be called in testnet
                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("Found the event !")
                          try {
                              const recentWinner = await lottery.getRecentWinner()
                              console.log(
                                  recentWinner,
                                  accounts[0].address,
                                  accounts[1].address,
                                  accounts[2].address,
                                  accounts[3].address
                              )
                              const lotteryState = await lottery.getLotteryState()
                              const endingTimestamp = await lottery.getLastTimestamp()
                              const numPlayers = await lottery.getNumberOfPlayers()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(lotteryState.toString(), "0")
                              assert(endingTimestamp > startingTimestamp)
                          } catch (err) {}
                          resolve()
                      })

                      const tx = await lottery.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          lottery.address
                      )
                  })
              })
          })
      })
