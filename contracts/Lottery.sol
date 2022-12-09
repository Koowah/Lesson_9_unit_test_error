// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lottery__NotEnoughETH();
error Lottery__TransferFailed();
error Lottery__NotOpen();
error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);

/** @title An automated 100% safe lottery contract
 * @author Apah
 * @notice This contract handles the world's biggest lottery
 * @dev This implements Chainlink VRF V2 and Chainlink Keepers
 */
contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /* State variables */
    uint256 private immutable entranceFee;
    address payable[] private players;
    bytes32 private immutable gasLane;
    uint64 private immutable subscriptionId;
    uint32 private immutable callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    VRFCoordinatorV2Interface private immutable vrfCoordinator;

    /* Lottery variables */
    address private recentWinner;
    LotteryState private lotteryState;
    uint256 private last_timestamp;
    uint256 private immutable interval;

    event LotteryEntered(address indexedPlayer);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee_,
        bytes32 gasLane_,
        uint64 subscriptionId_,
        uint32 callbackGasLimit_,
        uint256 interval_
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        entranceFee = entranceFee_;
        gasLane = gasLane_;
        subscriptionId = subscriptionId_;
        callbackGasLimit = callbackGasLimit_;
        vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        lotteryState = LotteryState.OPEN;
        last_timestamp = block.timestamp;
        interval = interval_;
    }

    /**
     * @notice Function to enter the lottery
     * requires minimum entrance fee and open
     * lottery
     * @dev tnakt
     */
    function enterLottery() public payable {
        if (msg.value < entranceFee) revert Lottery__NotEnoughETH();
        if (lotteryState != LotteryState.OPEN) revert Lottery__NotOpen();
        players.push(payable(msg.sender));

        emit LotteryEntered(msg.sender);
    }

    /**
     * @notice check if upkeep should be performed
     * requires open lottery, enough time passed,
     * players and funds
     * @dev uses chainlink keepers
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = LotteryState.OPEN == lotteryState;
        bool timePassed = ((block.timestamp - last_timestamp) >= interval);
        bool hasPlayers = players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
    }

    /**
     * @notice gets a provably random number
     * @dev uses chainlink VRF
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded)
            revert Lottery__UpkeepNotNeeded(address(this).balance, players.length, uint256(lotteryState));
        lotteryState = LotteryState.CALCULATING;
        uint256 requestId = vrfCoordinator.requestRandomWords(
            gasLane,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    /**
     * @notice gets a provably random winner
     * and resets lottery
     * @dev uses chainlink VRF & keepers
     */
    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        uint256 indexOfWinner = randomWords[0] % players.length;
        address payable recentWinner_ = players[indexOfWinner];
        recentWinner = recentWinner_;
        players = new address payable[](0);
        last_timestamp = block.timestamp;
        lotteryState = LotteryState.OPEN;
        (bool callSuccess, ) = msg.sender.call{value: address(this).balance}("");
        if (!callSuccess) revert Lottery__TransferFailed();

        emit WinnerPicked(recentWinner_);
    }

    function getEntranceFee() public view returns (uint256) {
        return entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return players[index];
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return lotteryState;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return players.length;
    }

    function getTimestamp() public view returns (uint256) {
        return last_timestamp;
    }

    function getRequestconfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }
}
