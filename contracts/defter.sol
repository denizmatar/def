//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Defter {
    /*
    BALANCES:
    {
        lineID1: {
            receiver1: amount,
            receiver2: amount,
            receiver3: amount
            },
        lineID2: {
            receiver4: amount,
            receiver5: amount,
            receiver6: amount
            },
        lineID3: {
            receiver7: amount,
            receiver8: amount
            }
    }
    */
    mapping(bytes32 => mapping(address => uint256)) balances;

    event OpenLine(
        address indexed from,
        // address[] receivers,
        // uint256[] amounts,
        bytes32 indexed lineID
    );

    event TransferLine(address indexed from, bytes32 indexed lineID);

    function hashLine(
        address _from,
        uint256 _maturityDate,
        string memory _unit
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_from, _maturityDate, _unit));
    }

    function getBalances(bytes32 _lineID, address _holder)
        external
        view
        returns (uint256)
    {
        return balances[_lineID][_holder];
    }

    // external yap, digerleri internal
    function openLine(
        uint256 _maturityDate,
        string memory _unit,
        address[] memory receivers,
        uint256[] memory amounts
    ) public {
        // check maturity
        require(_maturityDate > (block.timestamp + 1 days));

        // line hashle => lineID
        bytes32 _lineID = hashLine(msg.sender, _maturityDate, _unit);

        // holder list teki amount toplami == total amount olmali => bunu front end check etsin
        // bu loop'un cok pahali olmamasi icin frontend'e max receiver koyulmali mi?
        for (uint256 i = 0; i < receivers.length; i++) {
            require(receivers[i] != address(0));
            require(amounts[i] != 0);
            balances[_lineID][receivers[i]] += amounts[i];
        }

        // madem alicilari da log'da saklayalim?
        emit OpenLine(msg.sender, _lineID);
    }

    function transferLine(
        bytes32 lineID,
        address[] memory receivers,
        uint256[] memory amounts
    ) public {
        for (uint256 i = 0; i < receivers.length; i++) {
            require(balances[lineID][msg.sender] > 0);
            require(receivers[i] != address(0));
            require(amounts[i] != 0);
            balances[lineID][msg.sender] -= amounts[i];
            balances[lineID][receivers[i]] += amounts[i];
        }
        emit TransferLine(msg.sender, lineID);
    }
}
