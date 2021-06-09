// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC1155/IERC1155.sol";
import "openzeppelin-solidity/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Defter is ERC1155Holder {
    struct Line {
        bool isOpen;
        uint256 totalAmount;
    }

    mapping(bytes32 => Line) lines;

    mapping(bytes32 => mapping(address => uint256)) balances;

    event LineOpened(
        bytes32 indexed lineID,
        address indexed issuer,
        address unit,
        uint256 maturityDate
    );

    event LineTransferred(
        bytes32 indexed lineID,
        address indexed sender,
        address indexed receiver,
        uint256 amount
    );

    event LineClosed(bytes32 indexed lineID, address indexed issuer);

    event Withdrawn(
        bytes32 indexed lineID,
        address indexed receiver,
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

    function openLine(
        uint256 maturityDate,
        address unit,
        address receiver,
        uint256 amount
    ) external {
        require(
            maturityDate > (block.timestamp + 1 days),
            "can't open line for such a date this close"
        );
        bytes32 lineID = hashLine(msg.sender, maturityDate, unit);
        lines[lineID].isOpen = true;
        openLineHelper(lineID, receiver, amount);
        emit LineOpened(lineID, msg.sender, unit, maturityDate);
    }

    function openLineHelper(
        bytes32 _lineID,
        address _receiver,
        uint256 _amount
    ) internal {
        require(_receiver != address(0), "can't open line for 0 address");
        require(_amount != 0, "can't open line for 0 amount");
        balances[_lineID][_receiver] += _amount;
        lines[_lineID].totalAmount += _amount;
        emit LineTransferred(_lineID, msg.sender, _receiver, _amount);
    }

    function transferLine(
        bytes32[] calldata _lineIDs,
        uint256[] calldata _amounts,
        address _receiver
    ) external {
        require(
            _lineIDs.length > 0 && _amounts.length > 0,
            "missing line IDs or amounts"
        );
        require(
            _lineIDs.length == _amounts.length,
            "number of line IDs and amounts don't match"
        );

        for (uint256 i = 0; i < _lineIDs.length; i++) {
            require(
                balances[_lineIDs[i]][msg.sender] > 0,
                "sender has 0 balance" // should we specify the lineID here?
            );
            transferLineHelper(_lineIDs[i], _receiver, _amounts[i]);
        }
    }

    function transferLineHelper(
        bytes32 _lineID,
        address _receiver,
        uint256 _amount
    ) internal {
        require(_receiver != address(0), "can't transfer to 0 address");
        require(_amount != 0, "can't transfer 0 amount");
        balances[_lineID][msg.sender] -= _amount;
        balances[_lineID][_receiver] += _amount;
        emit LineTransferred(_lineID, msg.sender, _receiver, _amount);
    }

    function closeLine(
        uint256 _maturityDate,
        address _unit,
        uint256 _totalAmount
    ) external {
        bytes32 _lineID = hashLine(msg.sender, _maturityDate, _unit);
        require(_totalAmount == lines[_lineID].totalAmount);

        IERC1155 token = IERC1155(_unit);
        // ID and data hard coded
        token.safeTransferFrom(
            msg.sender,
            address(this),
            1,
            _totalAmount,
            "0x0"
        );

        lines[_lineID].isOpen = false;
        emit LineClosed(_lineID, msg.sender);
    }

    function withdraw(bytes32 _lineID, address _unit) external {
        uint256 amount = balances[_lineID][msg.sender];
        require(amount > 0, "amount can't be <= 0");

        IERC1155 token = IERC1155(_unit);
        token.safeTransferFrom(address(this), msg.sender, 1, amount, "0x0");

        balances[_lineID][msg.sender] = 0;
        emit Withdrawn(_lineID, msg.sender, amount);
    }
}
