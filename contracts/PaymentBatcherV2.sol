// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PaymentBatcherV2 {
    using SafeERC20 for IERC20;

    address private owner;
    uint256 internal locked = 1;
    
    event EtherReceived(address sender, uint256 amount, uint256 balance);
    event EtherTransferFailed(address recipient, uint256 amount);

    modifier noReentrant() {
        require(locked == 1, "No re-entrancy");
        locked = 2;
        _;
        locked = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferEtherToMany(uint256[] calldata _addressAmount, uint256 _gasLimit) external onlyOwner noReentrant {
        uint256 contractBalance = address(this).balance;
        for(uint256 i = 0; i < _addressAmount.length; i++) {
            (address _address, uint256 _amount) = splitAddressAmount(_addressAmount[i]);
            require(contractBalance >= _amount && _amount > 0, "Contract Ether balance is not enough or sending amount equal to zero");
            require(_address != address(0), "Recipient address cannot be null");
            contractBalance = contractBalance - _amount; 
        }

        for(uint256 i = 0; i < _addressAmount.length; i++) {
            (address _address, uint256 _amount) = splitAddressAmount(_addressAmount[i]);
            (bool sent, ) = _address.call{value: _amount, gas: _gasLimit}("");

            if(!sent) {
                emit EtherTransferFailed(_address, _amount);
            }
        }
    }

    function splitAddressAmount (uint256 _addressAmount) public pure returns(address, uint256) {
        return (address(uint160(_addressAmount / 2**96)), (_addressAmount % 2 ** 96));
    }
    
    // leftShiftBinary by n bits where n is 2**n (96) 
    function combineAddressAmount(address _address, uint96 _amount) public pure returns (bytes32) {
        return bytes32(uint256(uint160(_address)) * 2 ** 96 + uint256(_amount));
    }
    
    function transferTokensToMany(IERC20 _token, uint256[] calldata _addressAmount) external onlyOwner noReentrant {
        uint256 tokenBalance = _token.balanceOf(address(this));
        for(uint256 i = 0; i < _addressAmount.length; i++) {
            (address _address, uint256 _amount) = splitAddressAmount(_addressAmount[i]);
            require(tokenBalance >= _amount && _amount > 0, "Contract Token balance is not enough or sending amount equal to zero");
            require(_address != address(0), "Recipient address cannot be null");
            tokenBalance = tokenBalance - _amount;
        }
        
        for(uint256 i = 0; i < _addressAmount.length; i++) {
            (address _address, uint256 _amount) = splitAddressAmount(_addressAmount[i]);
             _token.safeTransfer(_address, _amount);
        }
    }

    receive() external payable{
        require(msg.value > 0);
        emit EtherReceived(msg.sender, msg.value, address(this).balance);
    }
}
