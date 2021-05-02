//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "contracts/IERC20.sol";

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

    event LineOpened(
        address indexed from,
        address[] receivers,
        uint256[] amounts,
        bytes32 indexed lineID
    );

    event LineTransferred(
        address indexed from,
        address[] receivers,
        uint256[] amounts,
        bytes32 indexed lineID
    );

    event LineClosed(
        address indexed from,
        bytes32 indexed lineID,
        uint256 totalAmount
    );

    event Withdrawn(
        address indexed from,
        bytes32 indexed lineID,
        uint256 amount
    );

    function hashLine(
        address _from,
        uint256 _maturityDate,
        address _unit
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

    // function transfer(
    //     address sender,
    //     address recipient,
    //     uint256 amount,
    //     address tokenContractAddress
    // ) public returns (bool) {
    //     IERC20(tokenContractAddress).transferFrom(sender, recipient, amount);

    //     return true;
    // }

    function openLine(
        uint256 _maturityDate,
        address _unit,
        address[] memory receivers,
        uint256[] memory amounts
    ) external {
        openLineHelper(_maturityDate, _unit, receivers, amounts);
    }

    function openLineHelper(
        uint256 _maturityDate,
        address _unit,
        address[] memory receivers,
        uint256[] memory amounts
    ) internal {
        require(
            _maturityDate > (block.timestamp + 1 days),
            "can't open line for such a date this close"
        );

        bytes32 _lineID = hashLine(msg.sender, _maturityDate, _unit);

        for (uint256 i = 0; i < receivers.length; i++) {
            require(
                receivers[i] != address(0),
                "can't open line for 0 address"
            );
            require(amounts[i] != 0, "can't open line for 0 amount");
            balances[_lineID][receivers[i]] += amounts[i];
        }
        emit LineOpened(msg.sender, receivers, amounts, _lineID);
    }

    function transferLine(
        bytes32 lineID,
        address[] memory receivers,
        uint256[] memory amounts
    ) external {
        transferLineHelper(lineID, receivers, amounts);
    }

    function transferLineHelper(
        bytes32 lineID,
        address[] memory receivers,
        uint256[] memory amounts
    ) internal {
        for (uint256 i = 0; i < receivers.length; i++) {
            require(balances[lineID][msg.sender] > 0, "sender has 0 balance");
            require(receivers[i] != address(0), "can't transfer to 0 address");
            require(amounts[i] != 0, "can't transfer 0 amount");
            balances[lineID][msg.sender] -= amounts[i];
            balances[lineID][receivers[i]] += amounts[i];
        }
        // emitleri loop'un icine alamadim cunku testini yazamadim o sekilde
        // illa sartsa bir cozum uretebiliriz
        emit LineTransferred(msg.sender, receivers, amounts, lineID);
    }

    function closeLine(
        uint256 _maturityDate,
        address _unit,
        uint256 _totalAmount
    ) public {
        closeLineHelper(_maturityDate, _unit, _totalAmount);
    }

    // total amount parametre olarak alsin, ve front'end hesaplayip gondersin.
    // cunku burda for loop yapmak zorundayim, gereksiz maliyet gibi geldi.
    // balances[_linedID][0] yazmissin ama address bekledigini soyluyor bana
    function closeLineHelper(
        uint256 _maturityDate,
        address _unit,
        uint256 _totalAmount
    ) internal {
        IERC20 token = IERC20(_unit);
        bytes32 _lineID = hashLine(msg.sender, _maturityDate, _unit);
        token.transferFrom(msg.sender, address(this), _totalAmount);

        emit LineClosed(msg.sender, _lineID, _totalAmount);
        // artik withdraw edilebildigini belirtmem lazim ama nasil?
        // front end emit'i kontrol ederek bu isi halledebilir mi?
    }

    function withdraw(bytes32 _lineID, address _unit) public {
        uint256 amount = balances[_lineID][msg.sender];
        IERC20 token = IERC20(_unit);

        if (amount > 0) {
            balances[_lineID][msg.sender] = 0;

            if (!token.transfer(msg.sender, amount)) {
                balances[_lineID][msg.sender] = amount;
            } else {
                emit Withdrawn(msg.sender, _lineID, amount);
            }
        }
    }

    fallback() external payable {}
}
