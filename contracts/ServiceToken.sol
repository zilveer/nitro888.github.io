pragma solidity ^0.4.22;

import "./zeppelin-solidity/token/ERC20/BurnableToken.sol";
import "./zeppelin-solidity/ownership/Ownable.sol";

contract ServiceToken is BurnableToken, Ownable {
  struct SERVICE  {
		bool		enable;
		uint		amount;
	}
  modifier onlyService {
		require(services[msg.sender].enable);
		_;
	}

  mapping(address=>SERVICE) private services;
  uint256 constant                  rateBuy     = 1000;
  uint256 constant                  rateMileage = 1000;

  function serviceEnable(address _service) onlyOwner public {
    services[_service]    = SERVICE(true,services[_service].amount);
  }
  function serviceDisable(address _service) onlyOwner public {
    services[_service]    = SERVICE(false,services[_service].amount);
  }
  function serviceState(address _address) public constant returns (bool,uint){
    return (services[_address].enable,services[_address].amount);
  }

  event Mint(address indexed to, uint256 amount);
  function mint(uint256 _amount) private {
    totalSupply_          = totalSupply_.add(_amount);
    balances[msg.sender]  = balances[msg.sender].add(_amount);
    emit Mint(msg.sender, _amount);
    emit Transfer(address(0), msg.sender, _amount);
  }
  function buy() payable public returns (bool) {
    mint(msg.value.mul(rateBuy));
    return true;
  }
  function mileage(uint256 _amount) onlyService public returns (bool) {
    mint(_amount.mul(rateMileage));
    return true;
  }
}
