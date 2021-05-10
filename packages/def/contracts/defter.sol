//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "hardhat/console.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

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

    struct Line {
        bool isOpen;
        uint256 totalAmount;
    }

    mapping(bytes32 => Line) lines;

    mapping(bytes32 => mapping(address => uint256)) balances;

    event LineOpened(
        address indexed from,
        address receiver,
        uint256 amount,
        bytes32 indexed lineID
    );

    event LineTransferred(
        address indexed from,
        address receiver,
        uint256 amount,
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

    function openLine(
        uint256 _maturityDate,
        address _unit,
        address[] calldata _receivers,
        uint256[] calldata _amounts
    ) external {
        require(
            _maturityDate > (block.timestamp + 1 days),
            "can't open line for such a date this close"
        );
        require(
            _receivers.length > 0 && _amounts.length > 0,
            "missing receivers or amounts"
        );
        require(
            _receivers.length == _amounts.length,
            "number of receivers and amounts don't match"
        );

        bytes32 _lineID = hashLine(msg.sender, _maturityDate, _unit);

        lines[_lineID].isOpen = true;

        for (uint256 i = 0; i < _receivers.length; i++) {
            openLineHelper(_lineID, _receivers[i], _amounts[i]);
        }
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
        emit LineOpened(msg.sender, _receiver, _amount, _lineID);
    }

    function transferLine(
        bytes32 _lineID,
        address[] calldata _receivers,
        uint256[] calldata _amounts
    ) external {
        require(balances[_lineID][msg.sender] > 0, "sender has 0 balance");
        require(
            _receivers.length > 0 && _amounts.length > 0,
            "missing receivers or amounts"
        );
        require(
            _receivers.length == _amounts.length,
            "number of receivers and amounts don't match"
        );

        for (uint256 i = 0; i < _receivers.length; i++) {
            transferLineHelper(_lineID, _receivers[i], _amounts[i]);
        }
    }

    function transferLines(
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
        emit LineTransferred(msg.sender, _receiver, _amount, _lineID);
    }

    function closeLine(
        uint256 _maturityDate,
        address _unit,
        uint256 _totalAmount
    ) external {
        // total amount parametre olarak alsin, ve front'end hesaplayip gondersin.
        // cunku burda for loop yapmak zorundayim, gereksiz maliyet gibi geldi.
        // balances[_linedID][0] yazmissin ama address bekledigini soyluyor bana

        bytes32 _lineID = hashLine(msg.sender, _maturityDate, _unit);

        require(_totalAmount == lines[_lineID].totalAmount);

        IERC20 token = IERC20(_unit);
        token.transferFrom(msg.sender, address(this), _totalAmount);

        lines[_lineID].isOpen = false;

        emit LineClosed(msg.sender, _lineID, _totalAmount);
    }

    function withdraw(bytes32 _lineID, address _unit) external {
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
}
