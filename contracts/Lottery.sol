// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

error Lottery__NotEnoughETH();

/** @title An automated 100% safe lottery contract
 * @author Apah
 * @notice This contract handles the world's biggest lottery
 * @dev BOG
 */
contract Lottery {
    uint256 private immutable entranceFee;
    address payable[] private players;

    event LotteryEntered(address indexedPlayer);

    constructor(uint256 entranceFee_) {
        entranceFee = entranceFee_;
    }

    // Enter the lottery
    function enterLottery() public payable {
        if (msg.value < entranceFee) revert Lottery__NotEnoughETH();
        players.push(payable(msg.sender));

        emit LotteryEntered(msg.sender);
    }

    // Pick a random winner
    // function pickRandomWinner() {}

    function getEntranceFee() public view returns (uint256) {
        return entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return players[index];
    }
}
