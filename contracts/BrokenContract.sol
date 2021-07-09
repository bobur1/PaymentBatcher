// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

contract BrokenContract {
    function getBalance() public view returns(uint256){
        return address(this).balance;
    }
}
